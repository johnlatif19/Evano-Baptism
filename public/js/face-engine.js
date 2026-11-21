(function () {
  'use strict';

  const MODEL_URL = '/models';
  const state = {
    ready: false,
    loading: false,
    error: null,
    promise: null
  };

  async function loadModels() {
    if (state.ready) return true;
    if (state.loading) return state.promise;
    if (typeof faceapi === 'undefined') {
      state.error = new Error('مكتبة face-api غير محمّلة.');
      throw state.error;
    }

    state.loading = true;
    state.promise = (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        state.ready = true;
        return true;
      } catch (err) {
        state.error = err;
        throw err;
      } finally {
        state.loading = false;
      }
    })();

    return state.promise;
  }

  function fileToImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('تعذّر قراءة الصورة.'));
      };
      img.src = url;
    });
  }

  async function getDescriptorFromFile(file) {
    await loadModels();
    const img = await fileToImage(file);
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5
    });

    const detection = await faceapi
      .detectSingleFace(img, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;
    return detection.descriptor;
  }

  async function getDescriptorFromImage(img) {
    await loadModels();
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5
    });

    const detection = await faceapi
      .detectSingleFace(img, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;
    return detection.descriptor;
  }

  window.FaceEngine = {
    ready: () => state.ready,
    loading: () => state.loading,
    error: () => state.error,
    loadModels,
    getDescriptorFromFile,
    getDescriptorFromImage
  };

  if (typeof faceapi !== 'undefined') {
    loadModels().catch(() => {});
  } else {
    window.addEventListener('load', () => {
      if (typeof faceapi !== 'undefined') {
        loadModels().catch(() => {});
      }
    });
  }
})();
