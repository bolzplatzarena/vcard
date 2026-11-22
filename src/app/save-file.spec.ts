import { Directory } from '@capacitor/filesystem';
import { NativeApi, saveFile } from './save-file';

const png = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });

function createFakeNative(isNative: boolean): NativeApi {
  return {
    isNative: () => isNative,
    writeFile: vi.fn().mockResolvedValue({ uri: 'file:///cache/qr.png' }),
    share: vi.fn().mockResolvedValue({}),
  };
}

describe('saveFile', () => {
  afterEach(() => vi.restoreAllMocks());

  it('downloads via a link in the browser', async () => {
    const native = createFakeNative(false);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn(() => 'blob:x');

    await saveFile(png, 'qr.png', native);

    expect(click).toHaveBeenCalled();
    expect(native.writeFile).not.toHaveBeenCalled();
  });

  it('writes to the cache and opens the share sheet in the app', async () => {
    const native = createFakeNative(true);

    await saveFile(png, 'qr.png', native);

    expect(native.writeFile).toHaveBeenCalledWith({ path: 'qr.png', data: 'AQID', directory: Directory.Cache });
    expect(native.share).toHaveBeenCalledWith({ title: 'qr.png', files: ['file:///cache/qr.png'] });
  });

  it('ignores a cancelled share sheet but reports other errors', async () => {
    const native = createFakeNative(true);
    const share = vi.mocked(native.share);

    share.mockRejectedValueOnce(new Error('Share canceled'));
    await expect(saveFile(png, 'qr.png', native)).resolves.toBeUndefined();

    share.mockRejectedValueOnce(new Error('No app available'));
    await expect(saveFile(png, 'qr.png', native)).rejects.toThrow('No app available');
  });
});
