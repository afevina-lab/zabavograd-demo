#!/usr/bin/env python3
"""Rename/recompress the published 181 images and update 824 published entries.

This never imports the private working dictionary. It only modifies URLs and
pixel bounds of existing published word variants; IDs and lexical data remain
untouched. Run against a checkout of the gh-pages branch.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
from PIL import Image, ImageOps

SPECIAL={
 "arbuz_whole":"arbuz-tselyy",
 "arbuz_slice":"arbuz-dolka",
 "kran_water":"kran-vodoprovodnyy",
 "kran_construction":"kran-stroitelnyy",
 "truba_vodoprovodnaya":"truba-vodoprovodnaya",
 "truba_muzykalnaya":"truba-muzykalnaya",
 "shar":"shar-vozdushnyy"
}
def semantic_name(name):
    match=re.fullmatch(r"(?:(?:[0-9]{1,4}[a-z]?)_)?([a-z][a-z0-9_-]*)\.webp",name,re.I)
    if not match:
        raise ValueError("Unrecognized word image name "+name)
    stem=match.group(1)
    return SPECIAL.get(stem,stem.replace("_","-").lower())+".webp"

def main(root):
    assets=root/"assets/words"
    lib_path=root/"library.json"
    library=json.loads(lib_path.read_text(encoding="utf-8"))
    assert isinstance(library,list) and len(library)>=800, "Unexpected public library schema"
    files=sorted(assets.glob("*.webp"))
    assert len(files)==181, f"Expected exactly 181 published WebP drawings, got {len(files)}"
    names={p.name:semantic_name(p.name) for p in files}
    assert len(set(names.values()))==len(names), "Two images would have the same semantic filename"
    numeric=[p for p in files if re.match(r"^[0-9]+[a-z]?_",p.name)]
    js_files=list((root/"assets").glob("*.js"))
    for js in js_files:
        content=js.read_text(encoding="utf-8")
        hits=[p.name for p in numeric if p.name in content]
        if hits:
            raise RuntimeError(f"Built JS still embeds {len(hits)} legacy image filenames: "+", ".join(hits[:8]))
    variants=[]
    for entry in library:
        variants.extend(entry.get("variants") or [])
    linked=[v for v in variants if (v.get("src") or "").startswith("/assets/words/")]
    assert len(linked)==181, f"Expected 181 public linked word variants, got {len(linked)}"
    src_names=[Path(v["src"]).name for v in linked]
    assert len(set(src_names))==181, "Multiple published entries share an unexpectedly duplicated image"
    assert set(src_names)==set(names), "Published image URLs do not match files on gh-pages"

    manifest=[]
    new_dims={}
    for p in files:
        name=names[p.name]
        target=assets/name
        if target!=p and target.exists():
            raise RuntimeError("Collision: "+str(target))
        with Image.open(p) as original:
            original.load()
            original_size=original.size
            im=ImageOps.exif_transpose(original).convert("RGBA")
        im.thumbnail((960,960),Image.Resampling.LANCZOS)
        im.save(target,"WEBP",quality=86,method=3,exact=True)
        with Image.open(target) as check:
            check.load()
            assert max(check.size)<=960 and check.format=="WEBP"
            new_dims[p.name]=check.size
        if p!=target:
            p.unlink()
        manifest.append({
            "old_name":p.name,
            "filename":name,
            "original_dimensions":list(original_size),
            "published_dimensions":list(new_dims[p.name]),
            "sha256":hashlib.sha256(target.read_bytes()).hexdigest(),
            "bytes":target.stat().st_size
        })
    updates=0
    for v in linked:
        old=Path(v["src"]).name
        new=names[old]
        v["src"]="/assets/words/"+new
        if v.get("bounds"):
            b=v["bounds"]
            width,height=new_dims[old]
            source_w=b.get("sourceWidth")
            source_h=b.get("sourceHeight")
            if not (source_w and source_h):
                raise RuntimeError("Incomplete published image bounds for "+old)
            xs=width/source_w
            ys=height/source_h
            for field,scale in (("x",xs),("width",xs),("y",ys),("height",ys)):
                if field in b:
                    b[field]=round(b[field]*scale)
            b["sourceWidth"]=width
            b["sourceHeight"]=height
            assert 0<=b.get("x",0)<width and 0<=b.get("y",0)<height
        updates+=1
    assert updates==181
    lib_path.write_text(json.dumps(library,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    (assets/"semantic-images.json").write_text(json.dumps({
       "format":"WebP, max960px, RGBA, quality86",
       "files":manifest,
       "renamed":len(numeric),
       "linked_published_variants":updates
    },ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

    check=json.loads(lib_path.read_text(encoding="utf-8"))
    after=[v["src"] for e in check for v in e.get("variants",[]) if v.get("src","").startswith("/assets/words/")]
    assert len(after)==181 and len(set(after))==181
    assert all((root/s.lstrip("/")).is_file() for s in after),"Broken published word image URLs"
    assert not any(re.search(r"/[0-9]+[a-z]?_",x) for x in after),"Numeric image references remain"
    assert len(list(assets.glob("*.webp")))==181
    print(json.dumps({
        "published_words":len(library),
        "linked_published_images":updates,
        "renamed_legacy_files":len(numeric),
        "total_after_mb":round(sum(x["bytes"] for x in manifest)/1048576,2),
        "broken_links":0,
        "copied_private_words":False
    },ensure_ascii=False,indent=2))

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("directory",type=Path)
    main(parser.parse_args().directory)
