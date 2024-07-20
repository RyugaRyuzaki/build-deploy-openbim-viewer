import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as FRAG from "@thatopen/fragments";
import * as WEBIFC from "web-ifc";
import axios from "axios";
import {CustomIfcStreamer, StreamPropertiesSettings} from "./CustomIfcStreamer";
import {modelListSignal} from "@/Signal/modelList";
import {apiUrl} from "@api/config";
interface StreamedProperties {
  types: {
    [typeID: number]: number[];
  };

  ids: {
    [id: number]: number;
  };

  indexesFile: string;
}
export class IfcTileLoader extends OBC.Component implements OBC.Disposable {
  /**
   * A unique identifier for the component.
   * This UUID is used to register the component within the Components system.
   */
  static readonly uuid = "b07943e1-a81f-455c-a459-516baf395d6f" as const;
  static readonly maxSizeUpload = 20 * 1024 * 1024;
  readonly apiUrl = apiUrl;
  readonly aws3Host = import.meta.env.VITE_AWS3_HOST;
  readonly bucketName = import.meta.env.VITE_AWS3_BUCKET;
  readonly frag = "application/octet-stream" as const;
  readonly json = "application/json" as const;
  enabled = true;

  /** {@link Disposable.onDisposed} */
  readonly onDisposed = new OBC.Event();

  private webIfc: WEBIFC.LoaderSettings = {
    COORDINATE_TO_ORIGIN: true,
    //@ts-ignore
    OPTIMIZE_PROFILES: true,
  } as const;

  private wasm = {
    path: "https://unpkg.com/web-ifc@0.0.55/",
    absolute: true,
    logLevel: WEBIFC.LogLevel.LOG_LEVEL_OFF as WEBIFC.LogLevel | undefined,
  } as const;

  private excludedCategories = new Set([
    WEBIFC.IFCSPACE,
    WEBIFC.IFCREINFORCINGBAR,
    WEBIFC.IFCOPENINGELEMENT,
  ]);

  streamedBufferFiles!: {[fileName: string]: Uint8Array};

  constructor(components: OBC.Components) {
    super(components);
    this.components.add(IfcTileLoader.uuid, this);
    (async () => {
      await this.updateBucket();
    })();
  }
  /** {@link Disposable.dispose} */
  dispose() {
    (this.streamedBufferFiles as any) = null;
    this.onDisposed.trigger();
    this.onDisposed.reset();
  }
  streamFromServer = async (fileName: string) => {
    try {
      const customIfcStreamer = this.components.get(CustomIfcStreamer);
      if (!customIfcStreamer)
        throw new Error("customIfcStreamer is not initialized!");
      // const fileName = "18floor.ifc";
      const serverUrl = `${this.aws3Host}/${this.bucketName}/${fileName}`;
      customIfcStreamer.fromServer = true;
      const groupRaw = await axios({
        url: `${serverUrl}/fragmentsGroup.frag`,
        method: "GET",
        responseType: "arraybuffer",
      });
      const settingRaw = await axios({
        url: `${serverUrl}/setting.json`,
        method: "GET",
        responseType: "json",
      });
      const propertyRaw = await axios({
        url: `${serverUrl}/properties.json`,
        method: "GET",
        responseType: "json",
      });
      const propertyIndexesRaw = await axios({
        url: `${serverUrl}/properties-indexes.json`,
        method: "GET",
        responseType: "json",
      });
      const setting = settingRaw.data;
      const group = groupRaw.data;
      const {ids, types, indexesFile} = propertyRaw.data;
      const properties = {
        ids,
        types,
        indexesFile,
        relationsMap: this.getRelationsMapFromJSON(propertyIndexesRaw.data),
      } as StreamPropertiesSettings;
      await customIfcStreamer.loadFromServer(
        setting,
        new Uint8Array(group),
        true,
        serverUrl,
        properties
      );
    } catch (error) {
      console.log(error);
    }
  };
  private getRelationsMapFromJSON(relations: any) {
    const indexMap: OBC.RelationsMap = new Map();
    for (const expressID in relations) {
      const expressIDRelations = relations[expressID];
      const relationMap = new Map<number, number[]>();
      for (const relationID in expressIDRelations) {
        relationMap.set(Number(relationID), expressIDRelations[relationID]);
      }
      indexMap.set(Number(expressID), relationMap);
    }
    return indexMap;
  }
  async streamIfc(file: File) {
    const buffer = new Uint8Array(await file?.arrayBuffer());
    const fileName = file.name;
    const prefix = file.name + ".ifc-processed";
    /* ==========  IfcPropertyTiler  ========== */
    const ifcPropertiesTiler = this.components.get(OBC.IfcPropertiesTiler);
    ifcPropertiesTiler.settings.wasm = this.wasm;
    ifcPropertiesTiler.settings.autoSetWasm = false;
    ifcPropertiesTiler.settings.webIfc = this.webIfc;
    ifcPropertiesTiler.settings.excludedCategories = this.excludedCategories;
    ifcPropertiesTiler.settings.propertiesSize = 500;
    ifcPropertiesTiler.onIndicesStreamed.reset();
    ifcPropertiesTiler.onPropertiesStreamed.reset();

    const jsonFile: StreamedProperties = {
      types: {},
      ids: {},
      indexesFile: `${prefix}-properties`,
    };
    const propertyFiles: {name: string; bits: Blob}[] = [];
    let counter = 0;
    let propertyFileSize = 0;
    let propertyJson: FRAG.IfcProperties;

    let assets: OBC.StreamedAsset[] = [];
    let geometries: OBC.StreamedGeometries;
    let groupBuffer: Uint8Array;
    let geometryFilesCount = 0;
    const upLoadPropertyServer = async () => {
      try {
        const formData = new FormData();
        formData.append("bucketName", this.bucketName);
        formData.append("prefix", fileName);
        for (const file of propertyFiles) {
          const {name, bits} = file;
          formData.append("files", new File([bits], name, {type: this.json}));
        }
        const res = await axios.post(`${this.apiUrl}/upload`, formData);
        propertyFileSize = 0;
        propertyFiles.length = 0;
      } catch (error) {
        console.log(error);
      }
    };
    const upLoadGeometryFilesServer = async (maxSize = 100) => {
      const keys = Object.keys(this.streamedBufferFiles);
      const listForm: FormData[] = [];
      while (keys.length > 0) {
        const chunkKeys = keys.splice(0, Math.min(maxSize, keys.length)); // Sử dụng Math.min để lấy giá trị nhỏ nhất giữa maxSize và số lượng keys còn lại
        if (chunkKeys.length <= 0) continue;
        const formData = new FormData();
        formData.append("bucketName", this.bucketName);
        formData.append("prefix", fileName);
        for (const geometryFile in this.streamedBufferFiles) {
          const buffer = this.streamedBufferFiles[geometryFile];
          formData.append(
            "files",
            new File([buffer], geometryFile, {type: this.frag})
          );
        }
        listForm.push(formData);
      }
      if (listForm.length === 0) throw new Error("No Geometry files");
      try {
        await Promise.all(
          listForm.map(async (formData) => {
            return await axios.post(`${this.apiUrl}/upload`, formData);
          })
        );
      } catch (error) {
        console.log(error);
      }
    };
    const onSuccess = async () => {
      const customIfcStreamer = this.components.get(CustomIfcStreamer);
      if (!customIfcStreamer) return;
      customIfcStreamer.fromServer = false;
      if (
        assets.length === 0 ||
        geometries === undefined ||
        groupBuffer === undefined ||
        !propertyJson
      )
        return;
      const settings = {assets, geometries} as OBF.StreamLoaderSettings;

      await customIfcStreamer.loadFromLocal(
        settings,
        groupBuffer,
        true,
        propertyJson
      );
      await Promise.all([
        await this.uploadSetting(settings, groupBuffer, fileName),
        await upLoadGeometryFilesServer(),
        (async () => {
          if (propertyFiles.length > 0) {
            await upLoadPropertyServer();
          }
        })(),
        await this.updateBucket(),
      ]);
    };

    ifcPropertiesTiler.onPropertiesStreamed.add(
      async (props: {type: number; data: {[id: number]: any}}) => {
        const {type, data} = props;
        if (!jsonFile.types[type]) jsonFile.types[type] = [];
        jsonFile.types[type].push(counter);
        if (!propertyJson) propertyJson = {};
        for (const id in data) {
          jsonFile.ids[id] = counter;
          if (!propertyJson[id]) propertyJson[id] = data[id];
        }

        const name = `${prefix}-properties-${counter}`;
        const bits = new Blob([JSON.stringify(data)]);
        propertyFiles.push({bits, name});
        propertyFileSize += bits.size;
        if (
          propertyFileSize > IfcTileLoader.maxSizeUpload ||
          propertyFiles.length > 100
        ) {
          await upLoadPropertyServer();
        }
        counter++;
      }
    );
    ifcPropertiesTiler.onIndicesStreamed.add(
      async (props: Map<number, Map<number, number[]>>) => {
        const bits = new Blob([JSON.stringify(jsonFile)]);
        propertyFiles.push({
          name: `properties.json`,
          bits,
        });
        const relations = this.components.get(OBC.IfcRelationsIndexer);
        const serializedRels = relations.serializeRelations(props);
        propertyFiles.push({
          name: `properties-indexes.json`,
          bits: new Blob([serializedRels]),
        });
        await onSuccess();
      }
    );

    await ifcPropertiesTiler.streamFromBuffer(buffer);
    /* ==========  IfcGeometryTiler  ========== */
    const ifcGeometryTiler = this.components.get(OBC.IfcGeometryTiler);
    ifcGeometryTiler.settings.wasm = this.wasm;
    ifcGeometryTiler.settings.autoSetWasm = false;
    ifcGeometryTiler.settings.webIfc = this.webIfc;
    ifcGeometryTiler.settings.excludedCategories = this.excludedCategories;
    ifcGeometryTiler.settings.minGeometrySize = 10;
    ifcGeometryTiler.settings.minAssetsSize = 1000;
    ifcGeometryTiler.onAssetStreamed.reset();
    ifcGeometryTiler.onGeometryStreamed.reset();
    ifcGeometryTiler.onIfcLoaded.reset();

    const streamGeometry = async (
      data: OBC.StreamedGeometries,
      buffer: Uint8Array
    ) => {
      const geometryFile = `${prefix}-geometries-${geometryFilesCount}.frag`;
      if (geometries === undefined) geometries = {};
      if (!this.streamedBufferFiles) this.streamedBufferFiles = {};
      for (const id in data) {
        if (!geometries[id]) geometries[id] = {...data[id], geometryFile};
      }
      if (!this.streamedBufferFiles[geometryFile])
        this.streamedBufferFiles[geometryFile] = buffer;
      geometryFilesCount++;
    };

    ifcGeometryTiler.onAssetStreamed.add(
      async (assetItems: OBC.StreamedAsset[]) => {
        assets = [...assets, ...assetItems];
      }
    );

    ifcGeometryTiler.onGeometryStreamed.add(
      async ({
        data,
        buffer,
      }: {
        data: OBC.StreamedGeometries;
        buffer: Uint8Array;
      }) => {
        await streamGeometry(data, buffer);
      }
    );

    ifcGeometryTiler.onIfcLoaded.add(async (group: Uint8Array) => {
      groupBuffer = group;
      await onSuccess();
    });
    await ifcGeometryTiler.streamFromBuffer(buffer);
  }

  private async uploadSetting(
    setting: any,
    group: Uint8Array,
    fileName: string
  ) {
    try {
      const formData = new FormData();
      formData.append("bucketName", this.bucketName);
      formData.append("prefix", fileName);
      formData.append(
        "files",
        new File([new Blob([group])], "fragmentsGroup.frag", {type: this.frag})
      );
      formData.append(
        "files",
        new File([JSON.stringify(setting)], "setting.json", {type: this.json})
      );
      const res = await axios.post(`${this.apiUrl}/upload`, formData);
    } catch (error: any) {
      console.log(error);
    }
  }
  private async updateBucket() {
    try {
      const res = await axios({
        url: `${this.apiUrl}/buckets/${this.bucketName}`,
        method: "GET",
        responseType: "json",
      });

      modelListSignal.value = res.data.folders as string[];
    } catch (error: any) {
      console.log(error);
    }
  }
}
