import {effect} from "@preact/signals-react";
import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import {IfcTileLoader} from "@/Toolbars/Sections/IfcTileLoader";
import {modelListSignal} from "@/Signal/modelList";

export interface ModelsListUIState {
  components: OBC.Components;
  list: string[];
}
export const modelsList = (state: ModelsListUIState) => {
  const element = BUI.Component.create<BUI.Table, ModelsListUIState>(
    modelsListTemplate,
    state
  );
  const [, updateElement] = element;
  effect(() => {
    const list = modelListSignal.value;
    updateElement({list});
  });
  return element;
};
export const modelsListTemplate = (state: ModelsListUIState) => {
  const {components} = state;

  const ifcTileLoader = components.get(IfcTileLoader);
  const table = document.createElement("bim-table");
  table.addEventListener("cellcreated", ({detail}) => {
    const {cell} = detail;
    cell.style.padding = "0.25rem 0";
  });
  table.hiddenColumns = ["modelID"];
  table.headersHidden = true;

  const rowGroups: BUI.TableGroupData[] = [];
  for (let i = 0; i < state.list.length; i++) {
    const Name = modelListSignal.value[i];
    const rowGroup: BUI.TableGroupData = {
      data: {
        Name,
        modelID: Name,
      },
    };
    rowGroups.push(rowGroup);
  }

  table.dataTransform = {
    Name: (value, _row) => {
      const onLoad = async () => {
        const fileName = (value as string).split("/")[0];
        await ifcTileLoader.streamFromServer(fileName);
      };
      return BUI.html`
         <div style="display: flex; flex: 1; gap: var(--bim-ui_size-4xs); justify-content: space-between; overflow: auto;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--bim-ui_size-4xs); flex-grow: 1; overflow: auto;">
            <div style="min-height: 1.75rem; overflow: auto; display: flex;">
              <bim-label style="white-space: normal;">${value}</bim-label>
            </div>
         
          </div>
          <div style="display: flex; gap: var(--bim-ui_size-4xs); align-self: flex-start; flex-shrink: 0;">
            <bim-button @click=${onLoad}  icon="fluent:puzzle-cube-piece-20-filled" tooltip-title="Load Fragments"
          tooltip-text="Loads a pre-converted IFC from a Fragments file. Use this option if you want to avoid the conversion from IFC to Fragments."></bim-button>
          </div>
         </div>
        `;
    },
  };

  table.data = rowGroups;

  return BUI.html`
      <div>
        ${
          rowGroups.length === 0
            ? BUI.html`<bim-label>No models has been loaded yet</bim-label>`
            : table
        }
      </div>
    `;
};
