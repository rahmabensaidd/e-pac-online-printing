import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import CreativeEditorSDK from '@cesdk/cesdk-js';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './editor.html',
  styleUrl: './editor.css'
})
export class Editor implements AfterViewInit, OnDestroy {

  cesdk: any;
  backgroundEngine: any;
  currentLibraryEntry = 'ly.img.template';
  isLibraryLoading = false;
  libraryError = '';
  libraryAssets: any[] = [];
  readonly libraryTabs = [
    { id: 'ly.img.template', title: 'Templates', sourceId: 'ly.img.template' },
    { id: 'ly.img.image', title: 'Images', sourceId: 'ly.img.image' },
    { id: 'ly.img.text', title: 'Text', sourceId: 'ly.img.textComponents' },
    { id: 'ly.img.vectorpath', title: 'Shapes', sourceId: 'ly.img.vectorpath' },
    { id: 'ly.img.sticker', title: 'Stickers', sourceId: 'ly.img.sticker' }
  ] as const;

  async ngAfterViewInit(): Promise<void> {
    const version = CreativeEditorSDK.version;
    const localBaseURL = `/cesdk/${version}/`;

    console.log('=== DÉBUT INITIALISATION ===');

    // 1. Initialisation du SDK
    this.cesdk = await CreativeEditorSDK.create('#editor', {
      baseURL: localBaseURL,
      devMode: true,
    });

    const engine = this.cesdk.engine;
    const editorRect = (document.getElementById('editor') as HTMLElement | null)?.getBoundingClientRect();
    console.log('✅ SDK initialisé');
    if (editorRect) {
      console.log(`📐 Taille du conteneur editor: ${Math.round(editorRect.width)}x${Math.round(editorRect.height)}`);
    }

    // 2. Chargement des asset sources par défaut (obligatoire)
    console.log('🔄 Chargement des asset sources par défaut...');
    await this.cesdk.addDefaultAssetSources();
    await this.cesdk.addDemoAssetSources({
      sceneMode: 'Design'
    });

    // 3. Création de la scène
    await this.cesdk.createDesignScene();

    const page = engine.block.findByType('page')[0];
    if (page && engine.block.isValid(page)) {
      engine.block.setWidth(page, 400);
      engine.block.setHeight(page, 300);
    }
    console.log('✅ Scène créée');

    // 4. Conserver le dock natif CE.SDK, mais forcer les entrées à ouvrir
    // directement une grille. Dans 1.67, l'overview de groupes peut rester
    // visuellement vide alors que les assets sont bien présents.
    console.log('📚 Configuration minimale des entrées natives CE.SDK 1.67...');
    const nativeLibraryEntries = [
      {
        id: 'ly.img.template',
        title: 'Templates',
        sourceIds: ['ly.img.template']
      },
      {
        id: 'ly.img.sticker',
        title: 'Stickers',
        sourceIds: ['ly.img.sticker']
      },
      {
        id: 'ly.img.vectorpath',
        title: 'Shapes',
        sourceIds: ['ly.img.vectorpath']
      },
      {
        id: 'ly.img.image',
        title: 'Images',
        sourceIds: ['ly.img.image']
      },
      {
        id: 'ly.img.text',
        title: 'Text',
        sourceIds: ['ly.img.textComponents']
      }
    ] as const;

    for (const entry of nativeLibraryEntries) {
      try {
        this.cesdk.ui.updateAssetLibraryEntry(entry.id, {
          title: entry.title,
          sourceIds: entry.sourceIds,
          showGroupOverview: false,
          gridColumns: 2,
          gridItemHeight: 'auto'
        });
        console.log(`✅ Entry native ajustée: ${entry.id}`);
      } catch (error) {
        console.warn(`⚠️ Impossible d'ajuster l'entry native ${entry.id}:`, error);
      }
    }

    console.log('🗂️ Asset library entries natives:', this.cesdk.ui.findAllAssetLibraryEntries());
    console.log('🧾 Entry ly.img.template:', this.cesdk.ui.getAssetLibraryEntry('ly.img.template'));
    console.log('🧾 Entry ly.img.image:', this.cesdk.ui.getAssetLibraryEntry('ly.img.image'));
    console.log('🧾 Entry ly.img.text:', this.cesdk.ui.getAssetLibraryEntry('ly.img.text'));

    await this.logAssetLibraryDiagnostics();

    // 5. Tes créations d'éléments
    await this.createSampleShapes();
    this.addCustomIconButton();
    await this.insertSampleImages();

    // 6. Masquer le dock natif cassé en 1.67 sur ce montage et charger
    // notre librairie Angular custom pilotée par engine.asset.findAssets().
    this.cesdk.ui.setDockOrder([]);
    await this.loadLibraryAssets(this.currentLibraryEntry);

    console.log('=== FIN INITIALISATION ===');
  }

  private getActiveLibraryTab() {
    return this.libraryTabs.find((tab) => tab.id === this.currentLibraryEntry) ?? this.libraryTabs[0];
  }

  async selectLibraryTab(tabId: string): Promise<void> {
    if (tabId === this.currentLibraryEntry && this.libraryAssets.length > 0) {
      return;
    }

    this.currentLibraryEntry = tabId;
    await this.loadLibraryAssets(tabId);
  }

  async loadLibraryAssets(tabId: string): Promise<void> {
    const tab = this.libraryTabs.find((item) => item.id === tabId);

    if (!tab || !this.cesdk?.engine) {
      return;
    }

    this.isLibraryLoading = true;
    this.libraryError = '';
    this.libraryAssets = [];

    try {
      const result = await this.cesdk.engine.asset.findAssets(tab.sourceId, {
        page: 0,
        perPage: 48,
        locale: 'en'
      });

      this.libraryAssets = result.assets ?? [];
      console.log(`📚 Librairie Angular chargée pour ${tab.title}: ${this.libraryAssets.length} assets`);
    } catch (error) {
      console.error(`❌ Erreur chargement librairie ${tab.title}:`, error);
      this.libraryError = `Unable to load ${tab.title.toLowerCase()}.`;
    } finally {
      this.isLibraryLoading = false;
    }
  }

  async applyLibraryAsset(asset: any): Promise<void> {
    const tab = this.getActiveLibraryTab();
    const sourceId = tab.sourceId;

    try {
      if (sourceId === 'ly.img.template' && asset?.meta?.uri) {
        await this.cesdk.engine.scene.loadFromURL(asset.meta.uri);
        console.log(`✅ Template chargé: ${asset.label ?? asset.id}`);
        return;
      }

      const blockId = await this.cesdk.engine.asset.apply(sourceId, asset);
      if (blockId && this.cesdk.engine.block.isValid(blockId)) {
        this.cesdk.engine.block.setSelected(blockId, true);
      }

      console.log(`✅ Asset appliqué depuis ${sourceId}: ${asset.label ?? asset.id}`);
    } catch (error) {
      console.error(`❌ Erreur application asset ${asset?.id ?? 'unknown'}:`, error);
      this.libraryError = `Unable to apply ${(asset?.label ?? 'asset').toString()}.`;
    }
  }

  async logAssetLibraryDiagnostics(): Promise<void> {
    const sourcesToCheck = [
      'ly.img.template',
      'ly.img.sticker',
      'ly.img.sticker.misc',
      'ly.img.vectorpath',
      'ly.img.image',
      'ly.img.textComponents'
    ];

    const registeredSources = this.cesdk.engine.asset.findAllSources();
    console.log('🧭 Sources enregistrées dans CE.SDK:', registeredSources);

    for (const sourceId of sourcesToCheck) {
      const exists = registeredSources.includes(sourceId);
      console.log(`🔎 Source ${sourceId} ${exists ? 'trouvée' : 'absente'} dans le moteur`);

      if (!exists) {
        continue;
      }

      try {
        const result = await this.cesdk.engine.asset.findAssets(sourceId, {
          page: 0,
          perPage: 5,
          locale: 'en'
        });

        console.log(`📦 ${sourceId}: total=${result.total}, page=${result.currentPage}, returned=${result.assets.length}`);

        if (result.assets.length > 0) {
          console.log(`🖼️ Exemple asset ${sourceId}:`, {
            id: result.assets[0].id,
            label: result.assets[0].label,
            thumbUri: result.assets[0].meta?.thumbUri,
            uri: result.assets[0].meta?.uri
          });
        }
      } catch (error) {
        console.error(`❌ Impossible d'interroger la source ${sourceId}:`, error);
      }
    }
  }

  openDefaultAssetLibrary(): void {
    const assetLibraryPanelId = '//ly.img.panel/assetLibrary';
    console.log('📚 Ouverture de la librairie native CE.SDK...');

    try {
      this.currentLibraryEntry = 'ly.img.template';

      if (this.cesdk.ui.isPanelOpen(assetLibraryPanelId)) {
        this.cesdk.ui.closePanel(assetLibraryPanelId);
      }

      this.cesdk.ui.openPanel(assetLibraryPanelId, {
        payload: {
          entries: ['ly.img.template']
        }
      });

      window.dispatchEvent(new Event('resize'));

      console.log(
        this.cesdk.ui.isPanelOpen(assetLibraryPanelId)
          ? '✅ Panel Asset Library natif réellement ouvert'
          : '⚠️ openPanel appelé, mais le panel natif n\'est pas marqué comme ouvert'
      );

      window.setTimeout(() => {
        this.inspectNativeLibraryRender('native-open@400ms');
      }, 400);

      window.setTimeout(() => {
        this.inspectNativeLibraryRender('native-open@1500ms');
      }, 1500);
    } catch (error) {
      console.error('❌ Erreur ouverture librairie native:', error);
    }
  }

  inspectNativeLibraryRender(stage: string): void {
    const editorHost = document.getElementById('editor') as HTMLElement | null;
    const directChildren = editorHost ? Array.from(editorHost.children) as HTMLElement[] : [];
    const primaryUiChild =
      directChildren.find((child) => child.tagName !== 'LINK') ??
      directChildren[0] ??
      null;
    const rootForSearch: ParentNode | null =
      primaryUiChild ??
      editorHost ??
      document.querySelector('.ubq-public') ??
      document.body;

    const queryInRoot = (selector: string): HTMLElement[] =>
      rootForSearch ? Array.from(rootForSearch.querySelectorAll(selector)) as HTMLElement[] : [];

    const queryInDocument = (selector: string): HTMLElement[] =>
      Array.from(document.querySelectorAll(selector)) as HTMLElement[];

    const selectors = {
      panelContent: '[class*="LibraryPanel-module__panelContent"]',
      search: '[class*="AssetLibrarySearch-module__block"]',
      content: '[class*="AssetLibraryContent-module__block"]',
      motionWrapper: '[class*="AssetLibraryContent-module__motionWrapper"]',
      overview: '[class*="AssetLibraryOverview-module__block"]',
      grid: '[class*="AssetLibraryGrid-module__block"]',
      gridSkeleton: '[class*="AssetLibraryGridSkeleton-module__grid"]',
      sectionSkeleton: '[class*="AssetLibrarySectionSkeleton-module__block"]',
      card: '[class*="AssetLibraryCard-module__wrapper"]',
      empty: '[class*="AssetLibraryEmpty-module__block"]',
      loading: '[class*="AssetLibraryLoading-module__block"]'
    } as const;

    const describeFirst = (elements: HTMLElement[]) => {
      const first = elements[0];
      if (!first) {
        return null;
      }

      const rect = first.getBoundingClientRect();
      const styles = window.getComputedStyle(first);
      return {
        count: elements.length,
        tag: first.tagName,
        className: first.className,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        display: styles.display,
        position: styles.position,
        overflow: styles.overflow,
        overflowY: styles.overflowY,
        flex: styles.flex,
        minHeight: styles.minHeight,
        visibility: styles.visibility,
        opacity: styles.opacity
      };
    };

    const panelContent = queryInRoot(selectors.panelContent);
    const search = queryInRoot(selectors.search);
    const content = queryInRoot(selectors.content);
    const motionWrapper = queryInRoot(selectors.motionWrapper);
    const overview = queryInRoot(selectors.overview);
    const grid = queryInRoot(selectors.grid);
    const gridSkeleton = queryInRoot(selectors.gridSkeleton);
    const sectionSkeleton = queryInRoot(selectors.sectionSkeleton);
    const cards = queryInRoot(selectors.card);
    const empty = queryInRoot(selectors.empty);
    const loading = queryInRoot(selectors.loading);

    const docPanelContent = queryInDocument(selectors.panelContent);
    const docSearch = queryInDocument(selectors.search);
    const docContent = queryInDocument(selectors.content);
    const docMotionWrapper = queryInDocument(selectors.motionWrapper);
    const docOverview = queryInDocument(selectors.overview);
    const docGrid = queryInDocument(selectors.grid);
    const docGridSkeleton = queryInDocument(selectors.gridSkeleton);
    const docSectionSkeleton = queryInDocument(selectors.sectionSkeleton);
    const docCards = queryInDocument(selectors.card);
    const docEmpty = queryInDocument(selectors.empty);
    const docLoading = queryInDocument(selectors.loading);
    const assetLabels = rootForSearch
      ? Array.from(rootForSearch.querySelectorAll('[class*="AssetLibraryCard-module__label"]'))
          .map((node) => (node.textContent || '').trim())
          .filter(Boolean)
          .slice(0, 10)
      : [];

    const resourceEntries = performance
      .getEntriesByType('resource')
      .filter((entry) =>
        /(cdn\.img\.ly\/assets\/demo\/v3|\/cesdk\/1\.67\.0\/ly\.img\.|thumbnails\/|textComponents\/thumbnails\/|vectorpath\/thumbnails\/)/i.test(entry.name)
      )
      .slice(-15)
      .map((entry) => entry.name);

    const thumbnailEntries = performance
      .getEntriesByType('resource')
      .filter((entry) => /thumbnails\/|thumbUri|thumbnail/i.test(entry.name))
      .slice(-15)
      .map((entry) => entry.name);

    const visibleTitleCandidates = Array.from(document.querySelectorAll('button, div, span, h1, h2, h3'))
      .map((node) => node as HTMLElement)
      .filter((node) => {
        const text = (node.textContent || '').trim();
        return text === 'Templates' || text === 'Images' || text === 'Text' || text === 'Stickers' || text === 'Shapes';
      })
      .slice(0, 10)
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          tag: node.tagName,
          className: node.className,
          text: node.textContent?.trim(),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      });

    const iframeCount = document.querySelectorAll('iframe').length;

    console.log(`🧪 Rendu librairie [${stage}]:`, {
      currentLibraryEntry: this.currentLibraryEntry,
      rootPanelContent: describeFirst(panelContent),
      rootSearch: describeFirst(search),
      rootContent: describeFirst(content),
      rootMotionWrapper: describeFirst(motionWrapper),
      rootOverview: describeFirst(overview),
      rootGrid: describeFirst(grid),
      rootGridSkeleton: describeFirst(gridSkeleton),
      rootSectionSkeleton: describeFirst(sectionSkeleton),
      rootCards: describeFirst(cards),
      rootEmpty: describeFirst(empty),
      rootLoading: describeFirst(loading),
      docPanelContent: describeFirst(docPanelContent),
      docSearch: describeFirst(docSearch),
      docContent: describeFirst(docContent),
      docMotionWrapper: describeFirst(docMotionWrapper),
      docOverview: describeFirst(docOverview),
      docGrid: describeFirst(docGrid),
      docGridSkeleton: describeFirst(docGridSkeleton),
      docSectionSkeleton: describeFirst(docSectionSkeleton),
      docCards: describeFirst(docCards),
      docEmpty: describeFirst(docEmpty),
      docLoading: describeFirst(docLoading),
      assetLabels,
      visibleTitleCandidates,
      iframeCount,
      thumbnailRequestCount: thumbnailEntries.length,
      recentResourceCount: resourceEntries.length
    });

    console.log(`🧾 Résumé librairie [${stage}]:`, {
      rootPanelContentCount: panelContent.length,
      rootGridCount: grid.length,
      rootCardCount: cards.length,
      docPanelContentCount: docPanelContent.length,
      docGridCount: docGrid.length,
      docCardCount: docCards.length,
      docEmptyCount: docEmpty.length,
      docLoadingCount: docLoading.length,
      thumbnailRequestCount: thumbnailEntries.length,
      iframeCount
    });

    if (resourceEntries.length > 0) {
      console.log(`🌐 Ressources librairie récentes [${stage}]:`, resourceEntries);
    }

    if (thumbnailEntries.length > 0) {
      console.log(`🖼️ Thumbnails librairie récentes [${stage}]:`, thumbnailEntries);
    }
  }

  openLibraryEntry(entryId: string, title: string): void {
    const assetLibraryPanelId = '//ly.img.panel/assetLibrary';
    this.currentLibraryEntry = entryId;
    const expectedAssetLabels: Record<string, string> = {
      'ly.img.template': 'Blank Document',
      'ly.img.sticker': 'Vomiting',
      'ly.img.vectorpath': 'Square',
      'ly.img.image': 'Clear blue beach at an island from above',
      'ly.img.text': 'Box'
    };

    console.log(`📚 Ouverture de la librairie pour ${title} (${entryId})...`);

    try {
      if (this.cesdk.ui.isPanelOpen(assetLibraryPanelId)) {
        this.cesdk.ui.closePanel(assetLibraryPanelId);
      }

      this.cesdk.ui.openPanel(assetLibraryPanelId, {
        payload: {
          title,
          entries: [entryId]
        }
      });

      // Force a relayout for CE.SDK virtualized panels after route/layout changes.
      window.dispatchEvent(new Event('resize'));

      console.log(
        this.cesdk.ui.isPanelOpen(assetLibraryPanelId)
          ? `✅ Panel ${title} réellement ouvert`
          : `⚠️ openPanel appelé pour ${title}, mais le panel n'est pas marqué comme ouvert`
      );

      window.setTimeout(() => {
        this.inspectLibraryDom(title, expectedAssetLabels[entryId] ?? title);
      }, 400);
    } catch (error) {
      console.error(`❌ Erreur ouverture panel ${title}:`, error);
    }
  }

  inspectLibraryDom(title: string, expectedLabel: string): void {
    const editorHost = document.getElementById('editor') as HTMLElement | null;
    const directChildren = editorHost ? Array.from(editorHost.children) as HTMLElement[] : [];
    const firstChild = directChildren[0] ?? null;
    const primaryUiChild =
      directChildren.find((child) => child.tagName !== 'LINK') ??
      firstChild;
    const openShadowRoot =
      editorHost?.shadowRoot ??
      ((primaryUiChild as HTMLElement | null)?.shadowRoot ?? null);

    const rootForSearch: ParentNode | null =
      openShadowRoot ??
      primaryUiChild ??
      editorHost ??
      document.querySelector('.ubq-public') ??
      document.body;

    const allElements = rootForSearch ? Array.from(rootForSearch.querySelectorAll('*')) : [];
    const matchingTextElement = allElements.find((element) =>
      (element.textContent || '').includes(expectedLabel)
    ) as HTMLElement | undefined;

    const panelHeading = allElements.find((element) =>
      (element.textContent || '').trim() === title
    ) as HTMLElement | undefined;

    console.log(`🧪 Inspection DOM pour ${title}:`, {
      expectedLabel,
      editorChildCount: directChildren.length,
      firstChildTag: firstChild?.tagName ?? null,
      primaryUiChildTag: primaryUiChild?.tagName ?? null,
      editorHasShadowRoot: !!editorHost?.shadowRoot,
      primaryUiChildHasShadowRoot: !!(primaryUiChild as HTMLElement | null)?.shadowRoot,
      usingShadowRoot: !!openShadowRoot,
      nodeCount: allElements.length,
      labelFoundInDom: !!matchingTextElement,
      titleFoundInDom: !!panelHeading
    });

    if (primaryUiChild) {
      const rect = primaryUiChild.getBoundingClientRect();
      console.log('🧱 Enfant UI principal du host editor:', {
        tagName: primaryUiChild.tagName,
        className: primaryUiChild.className,
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    }

    if (panelHeading) {
      const rect = panelHeading.getBoundingClientRect();
      console.log(`🧭 Heading DOM trouvé pour ${title}:`, {
        tagName: panelHeading.tagName,
        className: panelHeading.className,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        text: panelHeading.textContent?.trim()
      });
    }

    if (matchingTextElement) {
      const rect = matchingTextElement.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(matchingTextElement);
      console.log(`🧱 Élément DOM trouvé pour ${expectedLabel}:`, {
        tagName: matchingTextElement.tagName,
        className: matchingTextElement.className,
        text: matchingTextElement.textContent?.trim(),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity
      });
    }
  }

// 🔍 Méthode de débogage améliorée
  async debugAssetFormat(): Promise<void> {
    const version = CreativeEditorSDK.version;
    const absoluteAssetBaseURL = `${window.location.origin}/cesdk/${version}/`;

    const sources = ['ly.img.image', 'ly.img.sticker', 'ly.img.template'];

    for (const source of sources) {
      const url = `${absoluteAssetBaseURL}${source}/content.json`;
      console.log(`\n=== DEBUG ${source} ===`);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`❌ HTTP ${response.status}: ${url}`);
          continue;
        }

        const data = await response.json();

        console.log('📄 Structure complète:', {
          type: typeof data,
          isArray: Array.isArray(data),
          keys: Object.keys(data),
          hasAssets: !!data.assets,
          assetsType: data.assets ? typeof data.assets : 'undefined',
          assetsIsArray: Array.isArray(data.assets)
        });

        // Trouver où sont les assets
        let assetsLocation = null;
        if (Array.isArray(data)) {
          assetsLocation = 'root array';
          console.log(`✅ Assets sont à la racine (array de ${data.length} éléments)`);
          if (data.length > 0) {
            console.log('Exemple premier asset:', data[0]);
          }
        } else if (Array.isArray(data.assets)) {
          assetsLocation = 'data.assets';
          console.log(`✅ Assets dans data.assets (${data.assets.length} éléments)`);
          if (data.assets.length > 0) {
            console.log('Exemple premier asset:', data.assets[0]);
          }
        } else if (data.data && Array.isArray(data.data)) {
          assetsLocation = 'data.data';
          console.log(`✅ Assets dans data.data (${data.data.length} éléments)`);
          if (data.data.length > 0) {
            console.log('Exemple premier asset:', data.data[0]);
          }
        } else {
          console.log('⚠️ Structure non standard, recherche récursive...');
          this.findAssetsRecursively(data, 'data');
        }

        // Afficher les champs d'un asset
        const firstAsset = this.getFirstAsset(data);
        if (firstAsset) {
          console.log('📦 Champs du premier asset:', Object.keys(firstAsset));
          console.log('Valeurs importantes:', {
            id: firstAsset.id,
            uri: firstAsset.uri || firstAsset.url || firstAsset.path,
            preview: firstAsset.previewURI || firstAsset.thumbnail || firstAsset.thumb,
            width: firstAsset.width,
            height: firstAsset.height
          });
        }

      } catch (error) {
        console.error(`❌ Erreur lecture ${source}:`, error);
      }
    }
  }

// Helper pour trouver les assets récursivement
  private findAssetsRecursively(obj: any, path: string): void {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj) && obj.length > 0 && (obj[0].uri || obj[0].url)) {
      console.log(`✅ Assets trouvés dans ${path} (array de ${obj.length} éléments)`);
      if (obj.length > 0) {
        console.log('Exemple:', obj[0]);
      }
      return;
    }

    for (const key in obj) {
      if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
        this.findAssetsRecursively(obj[key], `${path}.${key}`);
      }
    }
  }



// Helper pour récupérer le premier asset
  private getFirstAsset(data: any): any {
    if (Array.isArray(data) && data.length > 0) return data[0];
    if (data.assets && Array.isArray(data.assets) && data.assets.length > 0) return data.assets[0];
    if (data.data && Array.isArray(data.data) && data.data.length > 0) return data.data[0];
    return null;
  }
// Nouvelle méthode pour configurer la librairie
  async setupAssetLibrary(): Promise<void> {
    console.log('🔧 Configuration de la librairie d\'assets...');

    await new Promise(resolve => setTimeout(resolve, 300));

    // Définir les entrées de la librairie avec les IDs corrects
    const entries = [
      'ly.img.template',
      'ly.img.vectorpath',
      'ly.img.image',
      'ly.img.textComponents'
    ];

    // Pour chaque entrée, s'assurer que la source est liée
    for (const entryId of entries) {
      try {
        this.cesdk.ui.updateAssetLibraryEntry(entryId, {
          sourceIds: [entryId]
        });
        console.log(`✅ Entry configurée: ${entryId}`);
      } catch (error) {
        console.log(`⚠️ Entry non configurable: ${entryId}`, error);
      }
    }
  }

// Méthode pour forcer le rafraîchissement de la librairie
  refreshAssetLibraryEntries(): void {
    console.log('🔄 Rafraîchissement de la librairie...');

    // Essayer différentes méthodes pour forcer l'affichage
    try {
      // Re-configurer les entrées
      const entries = [
        'ly.img.template',
        'ly.img.vectorpath',
        'ly.img.image',
        'ly.img.textComponents',
        'ly.img.sticker',
        'ly.img.sticker.misc'
      ];
      for (const entryId of entries) {
        this.cesdk.ui.updateAssetLibraryEntry(entryId, {
          sourceIds: [entryId]
        });
      }
      console.log('✅ Librairie rafraîchie');
    } catch (error) {
      console.error('❌ Erreur rafraîchissement:', error);
    }
  }

// Nouvelle méthode pour configurer la librairie


// Méthode de secours pour créer une page manuellement
  async createManualPage(): Promise<void> {
    const engine = this.cesdk.engine;

    try {
      // Créer une page manuellement
      const page = engine.block.create('page');
      engine.block.setWidth(page, 400);
      engine.block.setHeight(page, 300);
      engine.block.setString(page, 'page/backgroundColor', '#FFFFFF');

      // Définir comme page courante
      engine.scene.setCurrentPage(page);
      console.log('✅ Page créée manuellement');
    } catch (error) {
      console.error('❌ Erreur création page manuelle:', error);
    }
  }

  // 🎨 CORRIGÉ : positions des shapes ramenées dans la page (600px de haut)
  async createSampleShapes(): Promise<void> {
    const engine = this.cesdk.engine;
    const page = engine.scene.getCurrentPage();

    if (!page) {
      console.error('Aucune page disponible');
      return;
    }

    // ✅ CORRIGÉ : startY ramené de 800 à 80 pour être visible
    const startY = 80;
    const spacing = 150;

    // Exemple 1 : Rectangle avec coins arrondis
    const rectBlock = engine.block.create('graphic');
    const rectShape = engine.block.createShape('rect');
    engine.block.setShape(rectBlock, rectShape);

    // Coins arrondis
    engine.block.setFloat(rectShape, 'shape/rect/cornerRadiusTL', 20);
    engine.block.setFloat(rectShape, 'shape/rect/cornerRadiusTR', 20);
    engine.block.setFloat(rectShape, 'shape/rect/cornerRadiusBL', 20);
    engine.block.setFloat(rectShape, 'shape/rect/cornerRadiusBR', 20);

    const rectFill = engine.block.createFill('color');
    engine.block.setColor(rectFill, 'fill/color/value', {
      r: 0.2, g: 0.5, b: 0.9, a: 1.0
    });
    engine.block.setFill(rectBlock, rectFill);

    engine.block.setWidth(rectBlock, 120);
    engine.block.setHeight(rectBlock, 120);
    engine.block.setPositionX(rectBlock, 50);
    engine.block.setPositionY(rectBlock, startY);
    engine.block.appendChild(page, rectBlock);
    console.log('✓ Rectangle avec coins arrondis créé');

    // Exemple 2 : Étoile
    const starBlock = engine.block.create('graphic');
    const starShape = engine.block.createShape('star');
    engine.block.setShape(starBlock, starShape);

    engine.block.setInt(starShape, 'shape/star/points', 5);
    engine.block.setFloat(starShape, 'shape/star/innerDiameter', 0.4);

    const starFill = engine.block.createFill('color');
    engine.block.setColor(starFill, 'fill/color/value', {
      r: 1.0, g: 0.8, b: 0.0, a: 1.0
    });
    engine.block.setFill(starBlock, starFill);

    engine.block.setWidth(starBlock, 120);
    engine.block.setHeight(starBlock, 120);
    engine.block.setPositionX(starBlock, 50 + spacing);
    engine.block.setPositionY(starBlock, startY);
    engine.block.appendChild(page, starBlock);
    console.log('✓ Étoile créée');

    // Exemple 3 : Ellipse
    const ellipseBlock = engine.block.create('graphic');
    const ellipseShape = engine.block.createShape('ellipse');
    engine.block.setShape(ellipseBlock, ellipseShape);

    const ellipseFill = engine.block.createFill('color');
    engine.block.setColor(ellipseFill, 'fill/color/value', {
      r: 0.3, g: 0.8, b: 0.4, a: 1.0
    });
    engine.block.setFill(ellipseBlock, ellipseFill);

    engine.block.setWidth(ellipseBlock, 120);
    engine.block.setHeight(ellipseBlock, 120);
    engine.block.setPositionX(ellipseBlock, 50 + spacing * 2);
    engine.block.setPositionY(ellipseBlock, startY);
    engine.block.appendChild(page, ellipseBlock);
    console.log('✓ Ellipse créée');

    // Exemple 4 : Polygone (hexagone)
    const polygonBlock = engine.block.create('graphic');
    const polygonShape = engine.block.createShape('polygon');
    engine.block.setShape(polygonBlock, polygonShape);

    engine.block.setInt(polygonShape, 'shape/polygon/sides', 6);

    const polygonFill = engine.block.createFill('color');
    engine.block.setColor(polygonFill, 'fill/color/value', {
      r: 0.6, g: 0.2, b: 0.8, a: 1.0
    });
    engine.block.setFill(polygonBlock, polygonFill);

    engine.block.setWidth(polygonBlock, 120);
    engine.block.setHeight(polygonBlock, 120);
    engine.block.setPositionX(polygonBlock, 50 + spacing * 3);
    engine.block.setPositionY(polygonBlock, startY);
    engine.block.appendChild(page, polygonBlock);
    console.log('✓ Hexagone créé');

    // Exemple 5 : Sticker (emoticon)
    const stickerUrl = 'https://cdn.img.ly/assets/v4/ly.img.sticker/images/emoticons/imgly_sticker_emoticons_grin.svg';
    const stickerBlock = await engine.block.addImage(stickerUrl, {
      size: { width: 120, height: 120 }
    });
    engine.block.setKind(stickerBlock, 'sticker');
    engine.block.setPositionX(stickerBlock, 50 + spacing * 4);
    engine.block.setPositionY(stickerBlock, startY);
    engine.block.appendChild(page, stickerBlock);
    console.log('✓ Sticker ajouté');
  }

  // Utiliser explicitement le Dock API de CE.SDK 1.67 pour lier les boutons
  // aux entrées custom de la librairie.
  configureAssetLibraryDock(): void {
    this.cesdk.ui.setDockOrder([
      {
        id: 'ly.img.assetLibrary.dock',
        key: 'templates',
        label: 'Templates',
        icon: '@imgly/Template',
        entries: ['ly.img.template']
      },
      {
        id: 'ly.img.assetLibrary.dock',
        key: 'stickers',
        label: 'Stickers',
        icon: '@imgly/Sticker',
        entries: ['ly.img.sticker']
      },
      {
        id: 'ly.img.assetLibrary.dock',
        key: 'elements',
        label: 'Elements',
        icon: '@imgly/Shapes',
        entries: ['ly.img.vectorpath']
      },
      {
        id: 'ly.img.assetLibrary.dock',
        key: 'images',
        label: 'Images',
        icon: '@imgly/Image',
        entries: ['ly.img.image']
      },
      {
        id: 'ly.img.assetLibrary.dock',
        key: 'text',
        label: 'Text',
        icon: '@imgly/Text',
        entries: ['ly.img.text']
      }
    ]);
  }

  // Méthode pour ajouter un bouton personnalisé avec icône
  addCustomIconButton(): void {
    this.cesdk.ui.registerComponent(
        'MyCustomButtons',
        ({ builder: { Button } }: any) => {
          Button('saveButton', {
            label: 'Enregistrer',
            icon: '@imgly/Save',
            onClick: () => {
              console.log('Bouton Enregistrer cliqué !');
              this.saveDesign();
            }
          });

          Button('downloadButton', {
            label: 'Télécharger',
            icon: '@imgly/Download',
            onClick: () => {
              console.log('Bouton Télécharger cliqué !');
              this.downloadDesign();
            }
          });

          Button('shareButton', {
            label: 'Partager',
            icon: '@imgly/Share',
            onClick: () => {
              console.log('Bouton Partager cliqué !');
            }
          });

          Button('addImageButton', {
            label: 'Ajouter Image',
            icon: '@imgly/Image',
            onClick: () => {
              console.log('Bouton Ajouter Image cliqué !');
              this.addImageToCanvas();
            }
          });

          Button('addShapeButton', {
            label: 'Ajouter Shape',
            icon: '@imgly/Shapes',
            onClick: () => {
              console.log('Bouton Ajouter Shape cliqué !');
              this.addShapeToCanvas();
            }
          });

          Button('addStickerButton', {
            label: 'Ajouter Sticker',
            icon: '@imgly/Sticker',
            onClick: () => {
              console.log('Bouton Ajouter Sticker cliqué !');
              this.addStickerToCanvas();
            }
          });
        }
    );

    this.cesdk.ui.setCanvasMenuOrder([
      ...this.cesdk.ui.getCanvasMenuOrder(),
      'MyCustomButtons'
    ]);
  }

  async addShapeToCanvas(): Promise<void> {
    const engine = this.cesdk.engine;
    const page = engine.scene.getCurrentPage();

    if (!page) {
      console.error('Aucune page disponible');
      return;
    }

    const pageWidth = engine.block.getWidth(page);
    const pageHeight = engine.block.getHeight(page);

    const starBlock = engine.block.create('graphic');
    const starShape = engine.block.createShape('star');
    engine.block.setShape(starBlock, starShape);

    engine.block.setInt(starShape, 'shape/star/points', 5);
    engine.block.setFloat(starShape, 'shape/star/innerDiameter', 0.5);

    const fill = engine.block.createFill('color');
    engine.block.setColor(fill, 'fill/color/value', {
      r: 1.0, g: 0.6, b: 0.0, a: 1.0
    });
    engine.block.setFill(starBlock, fill);

    engine.block.setWidth(starBlock, 150);
    engine.block.setHeight(starBlock, 150);
    engine.block.setPositionX(starBlock, (pageWidth - 150) / 2);
    engine.block.setPositionY(starBlock, (pageHeight - 150) / 2);
    engine.block.appendChild(page, starBlock);
    engine.block.setSelected(starBlock, true);

    console.log('✓ Nouvelle étoile ajoutée au centre du canvas');
  }

  async addStickerToCanvas(): Promise<void> {
    const engine = this.cesdk.engine;
    const page = engine.scene.getCurrentPage();

    if (!page) {
      console.error('Aucune page disponible');
      return;
    }

    const pageWidth = engine.block.getWidth(page);
    const pageHeight = engine.block.getHeight(page);

    const stickerUrl = 'https://cdn.img.ly/assets/v4/ly.img.sticker/images/emoticons/imgly_sticker_emoticons_star.svg';
    const stickerBlock = await engine.block.addImage(stickerUrl, {
      size: { width: 150, height: 150 }
    });
    engine.block.setKind(stickerBlock, 'sticker');
    engine.block.setPositionX(stickerBlock, (pageWidth - 150) / 2);
    engine.block.setPositionY(stickerBlock, (pageHeight - 150) / 2);
    engine.block.appendChild(page, stickerBlock);
    engine.block.setSelected(stickerBlock, true);

    console.log('✓ Nouveau sticker ajouté au centre du canvas');
  }

  async insertSampleImages(): Promise<void> {
    const engine = this.cesdk.engine;
    const page = engine.scene.getCurrentPage();

    if (!page) {
      console.error('Aucune page disponible');
      return;
    }

    const imageUrl1 = 'https://img.ly/static/ubq_samples/sample_1.jpg';
    const imageBlock1 = await engine.block.addImage(imageUrl1, {
      size: { width: 400, height: 300 },
      x: 100,
      y: 250,
      cornerRadius: 20
    });
    engine.block.appendChild(page, imageBlock1);
    console.log('✓ Image 1 ajoutée avec coins arrondis');

    const imageUrl2 = 'https://img.ly/static/ubq_samples/sample_2.jpg';
    const manualBlock = engine.block.create('graphic');

    const shape = engine.block.createShape('rect');
    engine.block.setShape(manualBlock, shape);

    const fill = engine.block.createFill('image');
    engine.block.setString(fill, 'fill/image/imageFileURI', imageUrl2);
    engine.block.setFill(manualBlock, fill);

    engine.block.setWidth(manualBlock, 400);
    engine.block.setHeight(manualBlock, 300);
    engine.block.setPositionX(manualBlock, 600);
    engine.block.setPositionY(manualBlock, 250);
    engine.block.appendChild(page, manualBlock);
    console.log('✓ Image 2 ajoutée manuellement');

    const imageUrl3 = 'https://img.ly/static/ubq_samples/sample_3.jpg';
    const containBlock = await engine.block.addImage(imageUrl3, {
      size: { width: 400, height: 300 },
      x: 350,
      y: 400
    });
    engine.block.appendChild(page, containBlock);

    if (engine.block.supportsContentFillMode(containBlock)) {
      engine.block.setContentFillMode(containBlock, 'Contain');
      console.log('✓ Image 3 ajoutée avec mode Contain');
    }
  }

  async addImageToCanvas(): Promise<void> {
    const engine = this.cesdk.engine;
    const page = engine.scene.getCurrentPage();

    if (!page) {
      console.error('Aucune page disponible');
      return;
    }

    const imageUrl = 'https://img.ly/static/ubq_samples/sample_1.jpg';
    const pageWidth = engine.block.getWidth(page);
    const pageHeight = engine.block.getHeight(page);

    const imageBlock = await engine.block.addImage(imageUrl, {
      size: { width: 300, height: 200 },
      x: (pageWidth - 300) / 2,
      y: (pageHeight - 200) / 2,
      cornerRadius: 15
    });

    engine.block.appendChild(page, imageBlock);
    engine.block.setSelected(imageBlock, true);

    console.log('✓ Nouvelle image ajoutée au centre du canvas');
  }

  async addMultipleImages(imageUrls: string[]): Promise<void> {
    const engine = this.cesdk.engine;
    const page = engine.scene.getCurrentPage();

    if (!page) {
      console.error('Aucune page disponible');
      return;
    }

    for (let i = 0; i < imageUrls.length; i++) {
      const block = await engine.block.addImage(imageUrls[i], {
        size: { width: 200, height: 150 },
        x: 100 + i * 220,
        y: 450
      });
      engine.block.appendChild(page, block);
    }

    console.log(`✓ ${imageUrls.length} images ajoutées`);
  }

  async saveDesign(): Promise<void> {
    const sceneString = await this.cesdk.engine.scene.saveToString();
    console.log('Design sauvegardé :', sceneString);
  }

  async downloadDesign(): Promise<void> {
    const page = this.cesdk.engine.scene.getCurrentPage();
    if (page) {
      const blob = await this.cesdk.engine.block.export(page, 'image/png');
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'mon-design.png';
      link.click();

      URL.revokeObjectURL(url);
    }
  }

  async generateThumbnail(sceneData: string): Promise<Blob> {
    await this.backgroundEngine.scene.loadFromString(sceneData);

    const page = this.backgroundEngine.scene.getCurrentPage();
    if (!page) {
      throw new Error('No page available for thumbnail');
    }

    return await this.backgroundEngine.block.export(page, 'image/jpeg', {
      targetWidth: 200,
      targetHeight: 200
    });
  }

  ngOnDestroy(): void {
    this.backgroundEngine?.dispose();
    this.cesdk?.engine?.dispose();
  }
}
