import {useEffect, useRef} from "react";
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import load from "./Toolbars/Sections/Import";
import camera from "./Toolbars/Sections/Camera";
import selection from "./Toolbars/Sections/Selection";
import help from "./Panels/Help";
import settings from "./Panels/Settings";
import "./App.css";
import {CustomIfcStreamer} from "./Toolbars/Sections/CustomIfcStreamer";
import {AppManager} from "./bim-components";
import ProjectInformation from "./Panels/ProjectInformation";
import elementData from "./Panels/Selection";
import {modelListSignal} from "./Signal/modelList";
function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    BUI.Manager.init();
    const components = new OBC.Components();
    const worlds = components.get(OBC.Worlds);

    const world = worlds.create<
      OBC.SimpleScene,
      OBC.OrthoPerspectiveCamera,
      OBF.PostproductionRenderer
    >();
    world.name = "Main";

    world.scene = new OBC.SimpleScene(components);
    world.scene.setup();
    world.scene.three.background = null;
    const viewport = BUI.Component.create<BUI.Viewport>(() => {
      return BUI.html`
        <bim-viewport>
          <bim-grid floating></bim-grid>
        </bim-viewport>
      `;
    });
    world.renderer = new OBF.PostproductionRenderer(components, viewport);
    const {postproduction} = world.renderer;

    world.camera = new OBC.OrthoPerspectiveCamera(components);

    const worldGrid = components.get(OBC.Grids).create(world);
    worldGrid.material.uniforms.uColor.value = new THREE.Color(0x424242);
    worldGrid.material.uniforms.uSize1.value = 2;
    worldGrid.material.uniforms.uSize2.value = 8;

    const resizeWorld = () => {
      world.renderer?.resize();
      world.camera.updateAspect();
    };

    viewport.addEventListener("resize", resizeWorld);
    components.init();

    postproduction.enabled = true;
    postproduction.customEffects.excludedMeshes.push(worldGrid.three);
    postproduction.setPasses({custom: true, ao: true, gamma: true});
    postproduction.customEffects.lineColor = 0x17191c;

    const appManager = components.get(AppManager);
    const viewportGrid =
      viewport.querySelector<BUI.Grid>("bim-grid[floating]")!;
    appManager.grids.set("viewport", viewportGrid);

    const fragments = components.get(OBC.FragmentsManager);
    const indexer = components.get(OBC.IfcRelationsIndexer);
    const classifier = components.get(OBC.Classifier);
    classifier.list.CustomSelections = {};
    const ifcLoader = components.get(OBC.IfcLoader);
    (async () => {
      await ifcLoader.setup();
    })();

    const customIfcStreamer = components.get(CustomIfcStreamer);
    customIfcStreamer.world = world;
    customIfcStreamer.culler.threshold = 50;
    customIfcStreamer.culler.maxHiddenTime = 3000;
    customIfcStreamer.culler.maxLostTime = 30000;

    const highlighter = components.get(OBF.Highlighter);
    highlighter.setup({world});
    //set false
    highlighter.zoomToSelection = false;

    world.camera.controls.restThreshold = 0.25;
    const updateCulling = () => {
      customIfcStreamer.culler.needsUpdate = true;
    };
    world.camera.controls.addEventListener("rest", updateCulling);
    world.camera.controls.addEventListener("controlstart", updateCulling);
    world.camera.controls.addEventListener("controlend", updateCulling);
    world.camera.controls.addEventListener("wake", updateCulling);

    fragments.onFragmentsLoaded.add(async (model) => {
      if (model.hasProperties) {
        await indexer.process(model);
        classifier.byEntity(model);
      }

      for (const fragment of model.items) {
        world.meshes.add(fragment.mesh);
      }

      world.scene.three.add(model);
      setTimeout(async () => {
        world.camera.fit(world.meshes, 0.8);
      }, 50);
    });

    const projectInformationPanel = ProjectInformation(components);
    const elementDataPanel = elementData(components);

    const toolbar = BUI.Component.create(() => {
      return BUI.html`
        <bim-toolbar>
          ${load(components)}
          ${camera(world)}
          ${selection(components, world)}
        </bim-toolbar>
      `;
    });

    const leftPanel = BUI.Component.create(() => {
      return BUI.html`
        <bim-tabs switchers-full>
          <bim-tab name="project" label="Project" icon="ph:building-fill">
            ${projectInformationPanel}
          </bim-tab>
          <bim-tab name="settings" label="Settings" icon="solar:settings-bold">
            ${settings(components)}
          </bim-tab>
          <bim-tab name="help" label="Help" icon="material-symbols:help">
            ${help}
          </bim-tab>
        </bim-tabs> 
      `;
    });

    const app = BUI.Component.create(() => {
      return BUI.html`
        <bim-grid ></bim-grid>
      `;
    }) as BUI.Grid;
    app.layouts = {
      main: {
        template: `
      "leftPanel viewport" 1fr
      /26rem 1fr
    `,
        elements: {
          leftPanel,
          viewport,
        },
      },
    };

    app.layout = "main";

    viewportGrid.layouts = {
      main: {
        template: `
      "empty" 1fr
      "toolbar" auto
      /1fr
    `,
        elements: {toolbar},
      },
      second: {
        template: `
      "empty elementDataPanel" 1fr
      "toolbar elementDataPanel" auto
      /1fr 24rem
    `,
        elements: {
          toolbar,
          elementDataPanel,
        },
      },
    };

    viewportGrid.layout = "main";
    containerRef.current.appendChild(app);
    return () => {
      world.camera.controls.removeEventListener("rest", updateCulling);
      world.camera.controls.removeEventListener("controlstart", updateCulling);
      world.camera.controls.removeEventListener("controlend", updateCulling);
      world.camera.controls.removeEventListener("wake", updateCulling);
      viewport.removeEventListener("resize", resizeWorld);
      viewportGrid.remove();
      leftPanel.remove();
      app.remove();
      components.dispose();
      modelListSignal.value = [];
    };
  }, []);
  return (
    <div
      className="relative h-full w-hull overflow-hidden"
      ref={containerRef}
    ></div>
  );
}

export default App;
