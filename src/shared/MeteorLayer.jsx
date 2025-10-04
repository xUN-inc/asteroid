
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { COORDINATE_SYSTEM } from "@deck.gl/core";
import { ScenegraphNode } from "@luma.gl/engine";
import { GLTFLoader } from "@loaders.gl/gltf";
import { load } from "@loaders.gl/core";

const METEOR_URL = "/meteor.glb";

export class MeteorLayer extends SimpleMeshLayer {
    static layerName = "MeteorLayer";

    constructor(props) {
        const { data, ...rest } = props;

        const meteor = new Promise((resolve) => {
            load(METEOR_URL, GLTFLoader).then((gltf) => {
                const meteorScene = new ScenegraphNode(gltf.scenes[0]);
                resolve(meteorScene);
            });
        });

        super({
            ...rest,
            data: [data],
            mesh: meteor,
            sizeScale: 1,
            coordinateSystem: COORDINATE_SYSTEM.LNGLAT_OFFSETS,
            getOrientation: [0, 90, 90],
        });
    }
}
