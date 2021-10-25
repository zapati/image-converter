#!/bin/bash
outdir="../cwebp/butterfly"
mkdir -p "${outdir}"
for i in {1..67}
do
  webpmux -get frame ${i} butterfly.webp -o "${outdir}"/butterf${i}.webp
done

