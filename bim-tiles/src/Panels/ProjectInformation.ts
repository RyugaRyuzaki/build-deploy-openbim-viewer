import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";
import groupings from "./Sections/Groupings";
import {modelsList} from "./TableModel";
export default (components: OBC.Components) => {
  const [relationsTree] = CUI.tables.relationsTree({
    components,
    models: [],
    hoverHighlighterName: "hover",
    selectHighlighterName: "select",
  });
  relationsTree.preserveStructureOnFilter = true;
  const [table] = modelsList({components, list: []});
  const search = (e: Event) => {
    const input = e.target as BUI.TextInput;
    relationsTree.queryString = input.value;
  };

  return BUI.Component.create<BUI.Panel>(() => {
    return BUI.html`
      <bim-panel>
        <bim-panel-section label="List Models" icon="mage:box-3d-fill">
        ${table}
        </bim-panel-section>
        <bim-panel-section label="Spatial Structures" icon="ph:tree-structure-fill">
          <div style="display: flex; gap: 0.375rem;">
            <bim-text-input @input=${search} vertical placeholder="Search..." debounce="200"></bim-text-input>
            <bim-button style="flex: 0;" @click=${() =>
              (relationsTree.expanded =
                !relationsTree.expanded)} icon="eva:expand-fill"></bim-button>
          </div>
          ${relationsTree}
        </bim-panel-section>
        ${groupings(components)}
      </bim-panel> 
    `;
  });
};
