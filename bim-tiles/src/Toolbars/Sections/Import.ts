/* eslint-disable no-alert */
import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import {IfcTileLoader} from "./IfcTileLoader";

const input = document.createElement("input");
const askForFile = (extension: string) => {
  return new Promise<File | null>((resolve) => {
    input.type = "file";
    input.accept = extension;
    input.multiple = false;
    input.onchange = () => {
      const filesList = input.files;
      if (!(filesList && filesList[0])) {
        resolve(null);
        return;
      }
      const file = filesList[0];
      resolve(file);
    };
    input.click();
  });
};
//
export default (components: OBC.Components) => {
  const [loadBtn] = CUI.buttons.loadIfc({components});
  loadBtn.label = "IFC";
  loadBtn.tooltipTitle = "Load IFC";
  loadBtn.tooltipText =
    "Loads an IFC file into the scene. The IFC gets automatically converted to Fragments.";
  const ifcTileLoader = components.get(IfcTileLoader);
  const loadAsTiles = async () => {
    const file = await askForFile(".ifc");
    if (!file) return;
    ifcTileLoader.dispose();
    await ifcTileLoader.streamIfc(file);
  };

  return BUI.Component.create<BUI.PanelSection>(() => {
    return BUI.html`
      <bim-toolbar-section label="Import" icon="solar:import-bold">
       
        <bim-button @click=${loadAsTiles} label="Local Tiles" icon="fluent:puzzle-cube-piece-20-filled" tooltip-title="Load Fragments"
          tooltip-text="Loads a pre-converted IFC from a Fragments file. Use this option if you want to avoid the conversion from IFC to Fragments."></bim-button>
      </bim-toolbar-section>
    `;
  });
};
