import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
THREE.ColorManagement.legacyMode = false;
const V3 = THREE.Vector3, Qt = THREE.Quaternion;
const UP = new V3(0,1,0);
