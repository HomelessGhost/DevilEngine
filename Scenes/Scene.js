import ECS, { Components, Assemblages, Entity, System }  from "../ECS.js";

class Scene{
    constructor(){
        this.ECS = new ECS();
    }

    updateScene() { this.ECS.updateSystems(); return this; }
}

export default Scene;