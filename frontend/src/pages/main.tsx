import { useRouter } from 'next/router';
import { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface Teacher {
  id: number;
  fullName: string;
  unit: string;
  pmo?: string;
  post?: string;
  cabinet?: string;
  modelId?: number;
  photo?: string;
  modelUrl?: string | null;
}

export default function MainPage() {
  // ... все предыдущие состояния (без изменений)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAsideOpen, setIsAsideOpen] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState('СП - 4');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const [countdown, setCountdown] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const camera3dRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // --- Новые состояния для автоматической серии ---
  const [isShooting, setIsShooting] = useState(false);
  const [shootProgress, setShootProgress] = useState(0);

  const units = ['СП - 1', 'СП - 2', 'СП - 3', 'СП - 4', 'СП - 5'];

  // ... все useEffect (загрузка преподавателей, камера, Three.js, загрузка модели) остаются без изменений ...

  // Загрузка преподавателей
  useEffect(() => {
    const fetchTeachers = async () => {
      setLoading(true);
      setError(null);
      const unitForServer = selectedUnit.split(' - ')[1];
      try {
        const response = await fetch(
          `http://localhost:3001/getTeachersByUnit?unit=${encodeURIComponent(unitForServer)}`
        );
        if (!response.ok) throw new Error('Ошибка загрузки преподавателей');
        const data: Teacher[] = await response.json();
        setTeachers(data);
      } catch (err: any) {
        setError(err.message);
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, [selectedUnit]);

  // Камера
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        setCameraError('Не удалось получить доступ к камере: ' + err.message);
        console.error(err);
      }
    };
    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Three.js инициализация (код без изменений)
  useEffect(() => {
    if (!threeCanvasRef.current) return;
    const renderer = new THREE.WebGLRenderer({
      canvas: threeCanvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(0, 5, 5);
    scene.add(dirLight);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0.5, 2.5);
    camera.lookAt(0, 0, 0);
    camera3dRef.current = camera;

    const updateSize = () => {
      const parent = threeCanvasRef.current?.parentElement;
      if (parent && rendererRef.current && camera3dRef.current) {
        const w = parent.clientWidth;
        const h = parent.clientHeight;
        rendererRef.current.setSize(w, h, false);
        camera3dRef.current.aspect = w / h;
        camera3dRef.current.updateProjectionMatrix();
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', updateSize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
    };
  }, []);

  // Загрузка модели
  useEffect(() => {
    if (!selectedTeacher || !selectedTeacher.modelUrl || !sceneRef.current) {
      if (sceneRef.current) {
        const oldModel = sceneRef.current.getObjectByName('teacherModel');
        if (oldModel) sceneRef.current.remove(oldModel);
      }
      setModelLoaded(false);
      return;
    }

    const loader = new GLTFLoader();
    loader.load(
      selectedTeacher.modelUrl,
      (gltf) => {
        const model = gltf.scene;
        model.name = 'teacherModel';
        model.scale.set(1.25, 1.25, 1.25);
        model.position.set(0, -1.20, -0.30);
        model.rotation.set(0, 80, 0);

        const oldModel = sceneRef.current?.getObjectByName('teacherModel');
        if (oldModel) sceneRef.current?.remove(oldModel);

        sceneRef.current?.add(model);
        setModelLoaded(true);
      },
      undefined,
      (error) => console.error('Ошибка загрузки модели:', error)
    );
  }, [selectedTeacher, sceneRef]);

  // Фильтрация преподавателей
  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const query = searchQuery.toLowerCase().trim();
    const startsWith: Teacher[] = [];
    const contains: Teacher[] = [];
    teachers.forEach((teacher) => {
      const name = teacher.fullName.toLowerCase();
      if (name.startsWith(query)) startsWith.push(teacher);
      else if (name.includes(query)) contains.push(teacher);
    });
    return [...startsWith, ...contains];
  }, [teachers, searchQuery]);

  // --- Выделенная функция сохранения одного снимка ---
const captureAndSave = async (): Promise<{ id: number; photoName: string } | null> => {
  const video = videoRef.current;
  const canvas = canvasRef.current;
  const threeCanvas = threeCanvasRef.current;
  if (!video || !canvas || !threeCanvas) return null;

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  if (!videoWidth || !videoHeight) return null;

  // Принудительный рендер, чтобы модель была на 3D-канвасе
  if (modelLoaded && rendererRef.current && sceneRef.current && camera3dRef.current) {
    rendererRef.current.render(sceneRef.current, camera3dRef.current);
  }

  const threeWidth = threeCanvas.width;
  const threeHeight = threeCanvas.height;
  if (!threeWidth || !threeHeight) return null;

  const videoAspect = videoWidth / videoHeight;
  const threeAspect = threeWidth / threeHeight;

  // Вычисляем область, которая заполнит видео без искажений (cover)
  let sx = 0, sy = 0, sWidth = threeWidth, sHeight = threeHeight;
  if (videoAspect > threeAspect) {
    // Видео шире — обрезаем 3D-канвас сверху/снизу
    sHeight = threeWidth / videoAspect;
    sy = (threeHeight - sHeight) / 2;
  } else {
    // Видео уже — обрезаем слева/справа
    sWidth = threeHeight * videoAspect;
    sx = (threeWidth - sWidth) / 2;
  }

  // Скрытый canvas под видео
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Рисуем видео (зеркалим для фронтальной камеры)
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Накладываем 3D-канвас с обрезкой и растяжением (cover)
  ctx.drawImage(threeCanvas, sx, sy, sWidth, sHeight, 0, 0, videoWidth, videoHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob || !selectedTeacher) {
        resolve(null);
        return;
      }
      const formData = new FormData();
      formData.append('photo', blob, `photo_${Date.now()}.png`);
      formData.append('teacherId', String(selectedTeacher.id));

      try {
        const res = await fetch('http://localhost:3001/uploadPhoto', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error('Ошибка загрузки фото');
        const data = await res.json();
        resolve({ id: data.id, photoName: data.photoName });
      } catch (err) {
        console.error(err);
        reject(err);
      }
    }, 'image/png');
  });
};

  // --- Запуск автоматической серии ---
  const startSeries = async () => {
    if (isShooting || !selectedTeacher) return;
    setIsShooting(true);
    setShootProgress(0);
    const capturedPhotos: { id: number; photoName: string }[] = [];

    for (let i = 0; i < 5; i++) {
      // Обратный отсчёт 3-2-1
      for (let sec = 5; sec > 0; sec--) {
        setCountdown(sec);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      setCountdown(null); // убираем таймер

      try {
        const result = await captureAndSave();
        if (result) {
          capturedPhotos.push(result);
          setShootProgress(i + 1);
        } else {
          throw new Error('Пустой результат');
        }
      } catch (err) {
        console.error('Ошибка съёмки:', err);
        alert('Ошибка при съёмке');
        break;
      }
    }

    if (capturedPhotos.length === 5) {
      localStorage.setItem('capturedPhotos', JSON.stringify(capturedPhotos));
      alert('Серия снимков завершена!');
      router.push('/choose');
    } else {
      alert('Серия прервана, сделано снимков: ' + capturedPhotos.length);
    }
    setIsShooting(false);
  };

  // Обработчики UI

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const toggleAside = () => setIsAsideOpen(!isAsideOpen);
  const selectUnit = (unit: string) => {
    setSelectedUnit(unit);
    setIsDropdownOpen(false);
  };
  const handleSelectTeacher = (teacher: Teacher) => {
    toggleAside()
    setSelectedTeacher(teacher);
  }
  // --- Рендер ---
  return (
    <>
      <div className="camera">
        {cameraError ? (
          <div className="camera-error">{cameraError}</div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
        )}
        <canvas
          ref={threeCanvasRef}
          className="three-canvas"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Таймер обратного отсчёта */}
        {countdown !== null && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '120px',
              fontWeight: 'bold',
              color: 'white',
              textShadow: '0 0 20px rgba(0,0,0,0.8)',
              zIndex: 200,
              fontFamily: 'Gilroy, sans-serif',
            }}
          >
            {countdown}
          </div>
        )}

        <aside className={`aside-main ${!isAsideOpen ? 'aside-close' : ''}`}>
          <div className="container-aside">
            {/* ... header, search, dropdown ... */}
            <header className="header-main">
              <div className="header-block">
                {/* SVG logo */}
                <svg 
                  className="ref-logo"
                  viewBox="0 0 129 129"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M2.45634 128C1.65577 128 1.00682 127.381 1.00682 126.618V124.957C0.98215 124.493 0.936219 121.955 2.63523 119.168C3.69862 117.423 5.22707 115.925 7.17819 114.716C9.54227 113.25 12.5366 112.209 16.078 111.622C16.1593 111.61 18.8846 111.255 21.6529 110.559C26.4515 109.352 26.8712 108.286 26.8741 108.276C26.9023 108.17 26.9434 108.068 26.9959 107.973C27.0353 107.773 27.1327 107.022 26.9467 105.01C26.4736 99.8991 23.6797 96.8769 21.4359 94.4499C20.7288 93.6851 20.061 92.9626 19.5468 92.2542C17.3264 89.1958 17.1204 85.7182 17.1127 85.5716C17.1109 84.1144 17.8367 83.4758 18.4771 82.9123L18.4773 82.9122C18.5602 82.7423 18.5091 82.4908 18.4745 82.3208C17.8789 79.2445 17.8408 74.7933 18.3445 71.9365C18.4339 70.1373 21.3638 66.0289 24.6118 63.5413C27.8597 61.0542 28.3931 61.0207 32.0947 59.7517C33.8554 59.1481 39.3048 59.4754 43.2526 61.0128C47.6042 62.7074 50.3987 65.6661 50.4993 65.7736C51.6154 67.0474 52.4186 68.5909 52.9186 70.3962C53.0748 70.9595 53.1752 71.4324 53.2336 71.8801C53.7068 74.5017 53.6279 77.1955 53.5268 78.9967C53.47 80.0077 53.3517 81.0689 53.1546 82.3363C53.101 82.6803 53.1599 82.7476 53.1821 82.773L53.1821 82.773C53.2404 82.8394 53.3116 82.9117 53.3871 82.9879L53.3891 82.9901C53.6885 83.293 54.0985 83.708 54.3165 84.374C54.4258 84.7068 54.4769 85.0658 54.4769 85.5026C54.4676 85.7182 54.2615 89.1958 52.0414 92.2542C51.5266 92.9632 50.8583 93.6861 50.1506 94.4516C47.9068 96.8785 45.1143 99.8991 44.6415 105.01C44.4552 107.022 44.5526 107.773 44.592 107.973C44.6446 108.068 44.6856 108.17 44.714 108.276C44.7167 108.286 45.1381 109.356 49.9585 110.565C52.7267 111.259 55.4287 111.611 55.4556 111.614C59.0997 112.257 62.1125 113.324 64.4808 114.798C66.4386 116.016 67.9641 117.511 69.0153 119.242C70.6823 121.987 70.6145 124.469 70.5812 124.967V126.618C70.5812 127.381 69.9321 128 69.1316 128L2.45634 128Z" fill="#22539C" stroke="#22539C" strokeWidth="2" strokeLinejoin="round"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M80.5335 0.795898C107.478 0.795898 128.272 27.7094 128.272 59.4668C128.272 91.2244 107.478 118.139 80.5335 118.139V116.639H79.1975C78.6832 116.639 78.2038 116.375 77.929 115.94C77.9287 115.94 77.9279 115.939 77.927 115.938C77.9245 115.933 77.9195 115.925 77.9124 115.914C77.898 115.892 77.8747 115.856 77.8421 115.808C77.7763 115.71 77.6727 115.561 77.5325 115.368C77.2519 114.982 76.8217 114.421 76.2405 113.742C75.0767 112.384 73.3112 110.562 70.9241 108.739C70.8932 108.716 70.8632 108.691 70.8343 108.665C69.4699 107.443 67.1309 106.332 64.9495 105.271C63.9292 104.774 62.903 104.267 62.1848 103.787C61.8413 103.558 61.4238 103.242 61.1311 102.835C60.9763 102.619 60.803 102.304 60.7473 101.903C60.6872 101.468 60.7823 101.04 61.0052 100.674C62.2053 98.7051 63.9126 97.0458 66.0384 95.7275C68.6095 94.1335 71.8019 93.0388 75.4827 92.4287C75.4941 92.4268 75.5064 92.4254 75.5178 92.4238C75.6056 92.4114 78.2571 92.0646 80.9378 91.3906C83.2603 90.8068 84.4126 90.2828 84.9466 89.9658C85.056 89.9009 85.1351 89.8458 85.1907 89.8047C85.2118 89.518 85.2318 88.8201 85.1038 87.4355L85.0579 87.0127C84.5278 82.7044 82.1551 80.1024 79.9846 77.7549C79.2937 77.0075 78.5603 76.2162 77.9837 75.4219C75.5061 72.009 75.2775 68.1764 75.2649 67.9375C75.2636 67.9121 75.263 67.8858 75.263 67.8604C75.2617 66.8571 75.5188 66.0518 75.9378 65.3906C76.1417 65.069 76.3759 64.7977 76.596 64.5742C76.0274 61.3669 75.9996 56.9678 76.5081 54.0225C76.5718 53.2962 76.8665 52.5266 77.2132 51.832C77.5984 51.0605 78.1241 50.227 78.7356 49.3955C79.956 47.7364 81.5974 45.9801 83.3499 44.6377L83.9397 44.1904C85.2563 43.2045 86.1833 42.6021 87.1878 42.123C88.2916 41.5966 89.4785 41.2305 91.2591 40.6201C91.9092 40.3973 92.7555 40.2975 93.6214 40.2656C94.5188 40.2326 95.5556 40.2687 96.6468 40.373C98.8182 40.5807 101.311 41.0702 103.448 41.9023C108.106 43.7166 111.084 46.8636 111.244 47.0352C111.256 47.0472 111.267 47.0599 111.278 47.0723C112.56 48.5355 113.462 50.2867 114.015 52.2822L114.132 52.7295C114.234 53.1395 114.308 53.5232 114.361 53.9004L114.449 54.4258C114.855 57.0531 114.771 59.6553 114.675 61.3672V61.3682C114.621 62.3317 114.512 63.3281 114.343 64.4678C114.673 64.8219 115.127 65.3841 115.392 66.1924C115.561 66.7078 115.627 67.2309 115.627 67.7891C115.627 67.8106 115.627 67.833 115.626 67.8545C115.612 68.1714 115.385 72.0066 112.906 75.4219V75.4229C112.328 76.2175 111.594 77.009 110.903 77.7568C108.662 80.1799 106.208 82.873 105.785 87.4355C105.657 88.8197 105.676 89.5177 105.698 89.8047C105.754 89.8461 105.833 89.9018 105.945 89.9678C106.481 90.286 107.64 90.8112 109.974 91.3965C111.16 91.6938 112.341 91.9262 113.292 92.0947C118.883 83.2069 122.272 71.935 122.272 59.4668C122.272 29.7319 103.006 6.7959 80.5335 6.7959C60.5711 6.79632 43.1875 24.8107 39.5012 49.7832C39.2592 51.4222 37.734 52.5544 36.095 52.3125C34.4565 52.0702 33.324 50.5459 33.5657 48.9072C37.5297 22.0531 56.636 0.796316 80.5335 0.795898Z" fill="#22539C"/>
                </svg>
                <input
                  type="search"
                  className="search-input"
                  placeholder="Найти"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div id="dropdown" className="dropdown">
                  <a onClick={toggleDropdown} className="button-text-icon button-additional">
                    <span>{selectedUnit}</span>
                    <svg className={isDropdownOpen ? 'arrow-up' : 'arrow-down'} fill='none' width="32" height="32" viewBox="0 0 32 32">
                      <path d="M24 13L16 21L8 13" stroke="#0B1B33" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </a>
                  {isDropdownOpen && (
                    <div className="dropdown-elems dropdown-elems-open">
                      {units.map((unit) => (
                        <p key={unit} className="dropdown-option" onClick={() => selectUnit(unit)}>
                          {unit}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <svg
                onClick={toggleAside}
                className={`${isAsideOpen ? 'arrow-right' : 'arrow-left'}`}
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M13 9L21 17L13 25" stroke="#0B1B33" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </header>

            <div className="cards-block">
              {loading && <p>Загрузка...</p>}
              {error && <p className="error">Ошибка: {error}</p>}
              {!loading && !error && teachers.length === 0 && <p>Нет преподавателей в этом подразделении</p>}
              {!loading && !error && teachers.length > 0 && filteredTeachers.length === 0 && <p>Ничего не найдено</p>}
              {!loading &&
                filteredTeachers.map((teacher) => (
                  <article
                    key={teacher.id}
                    className={`card ${selectedTeacher?.id === teacher.id ? 'card-active' : ''}`}
                    onClick={() => handleSelectTeacher(teacher)}
                  >
                    <img
                      className="card-img"
                      src={`http://localhost:3001/photos/${teacher.photo}`}
                      alt={teacher.fullName}
                    />
                    <div className="card-info">
                      <h2>{teacher.fullName}</h2>
                      <h3>{teacher.post || 'Должность не указана'}</h3>
                    </div>
                  </article>
                ))}
            </div>
          </div>
        </aside>

        <button onClick={toggleAside} className="button-icon button-bg camera-aside-button">
          <svg width="32" fill="none" height="32" viewBox="0 0 32 32">
            <path d="M19 25L11 17L19 9" stroke="#0B1B33" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          onClick={startSeries}
          disabled={isShooting || !selectedTeacher}
          className="button-icon button-additional camera-screen-button"
        >
          {isShooting ? (
            <span style={{ fontSize: 24, color: 'white' }}>{shootProgress}/5</span>
          ) : (
            <svg width="32" height="32" fill="none" viewBox="0 0 32 32">
              <path d="M10 8L12 4H20L22 8H10Z" stroke="#0B1B33" stroke-width="2" stroke-linejoin="round"/>
              <path d="M27.3334 8H4.66669C3.56212 8 2.66669 8.89543 2.66669 10V26C2.66669 27.1046 3.56212 28 4.66669 28H27.3334C28.4379 28 29.3334 27.1046 29.3334 26V10C29.3334 8.89543 28.4379 8 27.3334 8Z" stroke="#0B1B33" stroke-width="2" stroke-linejoin="round"/>
              <path d="M16 23.3333C18.9456 23.3333 21.3334 20.9455 21.3334 18C21.3334 15.0545 18.9456 12.6667 16 12.6667C13.0545 12.6667 10.6667 15.0545 10.6667 18C10.6667 20.9455 13.0545 23.3333 16 23.3333Z" stroke="#0B1B33" stroke-width="2" stroke-linejoin="round"/>
            </svg>
          )}
        </button>
      </div>
    </>
  );
}