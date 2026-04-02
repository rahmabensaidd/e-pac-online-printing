import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import CreativeEditorSDK from '@cesdk/cesdk-js';

@Component({
  selector: 'app-editor',
  standalone: true,
  templateUrl: './editor.html'
})
export class Editor implements AfterViewInit, OnDestroy {

  cesdk: any;
  backgroundEngine: any;
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
    console.log('✅ SDK initialisé');

    // 2. Chargement des asset sources par défaut (obligatoire)
    console.log('🔄 Chargement des asset sources par défaut...');
    await this.cesdk.addDefaultAssetSources();

    // 3. Création de la scène
    await this.cesdk.createDesignScene();

    const page = engine.block.findByType('page')[0];
    if (page && engine.block.isValid(page)) {
      engine.block.setWidth(page, 400);
      engine.block.setHeight(page, 300);
    }
    console.log('✅ Scène créée');

    // 4. Ajout des entrées personnalisées
    console.log('🔧 Ajout des entrées à la librairie...');

    const libraryEntries = [
      {
        id: 'my.images',
        sourceIds: ['ly.img.image'],
        title: '📷 Images',
        previewLength: 6,
        gridColumns: 4,
        gridItemHeight: 'square'
      },
      {
        id: 'my.stickers',
        sourceIds: ['ly.img.sticker'],
        title: '🎨 Stickers',
        previewLength: 6,
        gridColumns: 4,
        gridItemHeight: 'square'
      },
      {
        id: 'my.templates',
        sourceIds: ['ly.img.template'],
        title: '📄 Templates',
        previewLength: 6,
        gridColumns: 4,
        gridItemHeight: 'square'
      },
      {
        id: 'my.vectors',
        sourceIds: ['ly.img.vectorpath'],
        title: '✏️ Vecteurs',
        previewLength: 6,
        gridColumns: 4,
        gridItemHeight: 'square'
      }
    ];

    for (const entry of libraryEntries) {
      try {
        await this.cesdk.ui.addAssetLibraryEntry(entry);
        console.log(`✅ Entry ajoutée: ${entry.id}`);
      } catch (error) {
        console.warn(`⚠️ Entry ${entry.id}:`, error);
      }
    }

    // 5. Configuration du Dock (version compatible v1.67)
    console.log('🔧 Configuration du dock...');

    const currentDockOrder = this.cesdk.ui.getDockOrder();

    // Vérifier si notre dock personnalisé existe déjà
    const hasCustomDock = currentDockOrder.some((item: any) =>
        item.id === 'ly.img.assetLibrary.dock'
    );

    if (!hasCustomDock) {
      const dockEntry = {
        id: 'ly.img.assetLibrary.dock',
        entries: ['my.images', 'my.stickers', 'my.templates', 'my.vectors'],
        label: 'libraries.my-library.label'
      };

      // Ajouter notre groupe en premier dans le dock
      this.cesdk.ui.setDockOrder([dockEntry, ...currentDockOrder]);
      console.log('✅ Dock configuré avec nos entrées personnalisées');
    } else {
      console.log('✅ Dock personnalisé déjà présent');
    }

    // Traductions
    this.cesdk.i18n.setTranslations({
      en: { 'libraries.my-library.label': '📦 Mes Assets' },
      fr: { 'libraries.my-library.label': '📦 Mes Assets' }
    });

    // 6. Tes créations d'éléments
    await this.createSampleShapes();
    this.customizeDockIcons();
    this.addCustomIconButton();
    await this.insertSampleImages();

    // 7. Ouvrir le panel
    setTimeout(async () => {
      console.log('📚 Ouverture de la librairie...');
      try {
        await this.cesdk.ui.openPanel('ly.img.panel.assetLibrary');
        console.log('✅ Panel Asset Library ouvert');
      } catch (error) {
        console.error('❌ Erreur ouverture panel:', error);
      }
    }, 1000);

    console.log('=== FIN INITIALISATION ===');
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
      'ly.img.image',
      'ly.img.sticker',
      'ly.img.template',
      'ly.img.vectorpath',
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
      const entries = ['ly.img.image', 'ly.img.sticker', 'ly.img.template', 'ly.img.vectorpath'];
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

  // Méthode pour personnaliser les icônes du dock
  customizeDockIcons(): void {
    const dockOrder = this.cesdk.ui.getDockOrder();

    const newDockOrder = dockOrder.map((entry: any) => {
      if (entry.key === 'ly.img.image') {
        return { ...entry, icon: '@imgly/ShapeStar' };
      }
      if (entry.key === 'ly.img.text') {
        return { ...entry, icon: '@imgly/Edit' };
      }

      return entry;
    });

    this.cesdk.ui.setDockOrder(newDockOrder);
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