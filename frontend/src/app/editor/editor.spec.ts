import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { Editor, normalizeBlankAsset, normalizeBlankAssets } from './editor';

describe('Editor', () => {
  let component: Editor;
  let fixture: ComponentFixture<Editor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Editor],
      providers: [provideHttpClient()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Editor);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should normalize blank dimensions and text fields', () => {
    expect(
      normalizeBlankAsset({
        id: 'blank-1',
        label: '  My Blank  ',
        pages: 0,
        meta: { width: 0, height: 420 }
      })
    ).toEqual({
      id: 'blank-1',
      label: 'My Blank',
      description: '',
      family: 'CUSTOM',
      type: 'blank',
      pages: 1,
      meta: {
        uri: '',
        thumbUri: '',
        width: 210,
        height: 420,
        thickness: undefined
      }
    });
  });

  it('should normalize a blank collection quickly without prevalidating files', async () => {
    const [asset] = await normalizeBlankAssets([
      {
        id: 'blank-2',
        label: 'Blank 2',
        meta: {
          uri: '/existing.scene',
          thumbUri: '/thumb.jpg',
          width: 300,
          height: 300
        }
      }
    ]);

    expect(asset.meta.uri).toBe('/existing.scene');
    expect(asset.meta.thumbUri).toBe('/thumb.jpg');
  });
});
