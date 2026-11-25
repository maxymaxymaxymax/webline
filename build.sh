#!/bin/bash
# usage: build.sh dev|prod
MODE=${1:-dev}
REL=0
if [ "$MODE" = release ]; then T="./lib/three.module.js"; A="./lib/jsm/"; OUT=release/index.html; BASE="models/"; EXT=".glb"; REL=1; mkdir -p release
elif [ "$MODE" = reldev ]; then T="/node_modules/three/build/three.module.js"; A="/node_modules/three/examples/jsm/"; OUT=reldev.html; BASE="/models/"; EXT=".glb"; REL=1
elif [ "$MODE" = prod ]; then T="https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.module.js"; A="https://cdn.jsdelivr.net/npm/three@0.149.0/examples/jsm/"; OUT=dist/index.html; BASE="models/"; EXT=".wasm";
else T="/node_modules/three/build/three.module.js"; A="/node_modules/three/examples/jsm/"; OUT=dev.html; BASE="/models/"; EXT=".glb"; fi
mkdir -p dist
{
if [ "$REL" = 1 ]; then echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'; fi
cat src/head.html
DP="${A}libs/draco/gltf/"
echo "<script>window.MODEL_BASE='$BASE';window.MODEL_EXT='$EXT';window.RELEASE=$REL;window.DRACO_PATH='$DP';</script>"
echo "<script type=\"importmap\">{\"imports\":{\"three\":\"$T\",\"three/addons/\":\"$A\"}}</script>"
echo '<script type="module">'
cat <<'JS'
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
JS
cat src/core.js src/textures.js src/city.js src/life.js src/train.js src/chars.js src/crowd.js src/hero.js src/player.js src/combat.js src/bosses.js src/music.js src/ui.js src/custom.js src/mobile.js
[ "$MODE" = dev -o "$MODE" = reldev ] && echo "window.__eval = s => eval(s);"
echo "</script>"
} > $OUT
echo built $OUT
