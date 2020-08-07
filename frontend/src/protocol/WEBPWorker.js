import { WebPDecoder } from '../utils/libwebp-0.2.0.js';
import { encode } from 'fast-png';

/**
 * Many thanks to Konstantin Darutkin
 */

function webp2png(binary) {
  // const data = new Uint8Array(ab);
  const decoder = new WebPDecoder();
  const config = decoder.WebPDecoderConfig;
  const buffer = config.j || config.output;
  const bitstream = config.input;

  decoder.WebPInitDecoderConfig(config);
  decoder.WebPGetFeatures(binary, binary.length, bitstream);

  /** MODE_RGBA = 1 MODE_ARGB = 4, */
  buffer.J = 1;

  let status;
  try {
    status = decoder.WebPDecode(binary, binary.length, config);
  } catch (e) {
    status = e;
  }

  if (status === 0) {
    const rgbaData = buffer.Jb;
    const pngData = encode({
      data: rgbaData,
      width: buffer.width,
      height: buffer.height,
      channels: 4,
      depth: 8,
    });

    // console.error(pngData);

    return pngData;
    // const blob = new Blob([pngData], { type: 'image/png' });
  }

  return null;
  // return ab;
}


onmessage = function(e) {
	console.log('WEBPWorker: Message received from main script', e);
	const {id, binary} = e.data;

	const png = webp2png(binary);
	postMessage({
		id: id,
		data: png,
	});
}