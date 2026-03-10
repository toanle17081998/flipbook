document.addEventListener('DOMContentLoaded', function() {
    
    // 1. App State & Elements
    const bookEl = document.getElementById('flip-book');
    const welcomeScreen = document.getElementById('welcome-screen');
    const startBtn = document.getElementById('start-btn');
    
    // Player Elements
    const audioPlayerUI = document.getElementById('audio-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const timeDisplay = document.getElementById('time-display');
    const playerTrackText = document.getElementById('player-track');
    const statusIcon = document.getElementById('status-icon');
    
    let currentAudio = null;
    let isUserActive = false; // Phải click thì trình duyệt mới cho autoplay
    let pageFlipLib = null;

    // 2. Format mm:ss
    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    // 3. Audio Controller
    const audioController = {
        audios: {}, // Chứa danh sách đối tượng Audio. Key là index trang
        queue: [], // Hàng đợi các trang cần phát nhạc
        
        init() {
            // Quét tất cả page có thuộc tính data-audio
            const pages = document.querySelectorAll('.page[data-audio]');
            pages.forEach((page, index) => {
                const src = page.getAttribute('data-audio');
                const pageIndex = Array.from(page.parentNode.children).indexOf(page);
                
                if (src) {
                    const audio = new Audio(src);
                    audio.addEventListener('timeupdate', this.updateUI.bind(this));
                    audio.addEventListener('ended', () => {
                        playPauseBtn.textContent = '▶️';
                        // Tiếp tục gọi bài tiếp theo trong hàng đợi
                        this.playNextInQueue();
                    });
                    this.audios[pageIndex] = audio;
                }
            });

            // Gắn sự kiện vô event click cho nút Play/Pause
            playPauseBtn.addEventListener('click', () => {
                if (!currentAudio) return;
                if (currentAudio.paused) {
                    currentAudio.play().catch(e => console.log('Wait for user interaction'));
                    playPauseBtn.textContent = '⏸️';
                } else {
                    currentAudio.pause();
                    playPauseBtn.textContent = '▶️';
                }
            });

            // Tua nhạc
            progressContainer.addEventListener('click', (e) => {
                if (!currentAudio) return;
                const width = progressContainer.clientWidth;
                const clickX = e.offsetX;
                const duration = currentAudio.duration;
                currentAudio.currentTime = (clickX / width) * duration;
            });
        },

        playSpread(pageIndices) {
            // Dừng nhạc cũ
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
                currentAudio = null;
            }

            // Xây dựng hàng đợi chỉ chứa các trang có khai báo audio
            this.queue = pageIndices.filter(index => this.audios[index] !== undefined);

            if (this.queue.length > 0) {
                this.playNextInQueue(true);
            } else {
                // Không trang nào trong tầm nhìn có nhạc thì ẩn player
                audioPlayerUI.classList.remove('visible');
            }
        },

        playNextInQueue(isFirst = false) {
            if (this.queue.length > 0) {
                const nextPage = this.queue.shift();
                currentAudio = this.audios[nextPage];
                if (isUserActive) {
                    const playPromise = currentAudio.play();
                    if (playPromise !== undefined) {
                        playPromise.then(() => {
                            playPauseBtn.textContent = '⏸️';
                            audioPlayerUI.classList.add('visible');
                            playerTrackText.textContent = `Đang phát nhạc - Trang ${nextPage}`;
                        }).catch(err => {
                            console.warn("Autoplay prevented:", err);
                        });
                    }
                }
            } else {
                // Đã hết bài trong hàng đợi của những trang đang mở
                if (!isFirst && pageFlipLib) {
                    // Delay nhẹ 800ms rối tự lật sang mặt sách mới cho tự nhiên
                    setTimeout(() => {
                        pageFlipLib.flipNext();
                    }, 800);
                }
            }
        },

        updateUI() {
            if (!currentAudio) return;
            const currentTime = currentAudio.currentTime;
            const duration = currentAudio.duration;
            
            if (duration > 0) {
                const percent = (currentTime / duration) * 100;
                progressBar.style.width = `${percent}%`;
                timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
            }
        }
    };

    // Khởi tạo AudioController
    audioController.init();

    // 4. Bắt đầu - Mở sách
    startBtn.addEventListener('click', () => {
        isUserActive = true;
        welcomeScreen.classList.remove('active');
        
        // Khởi tạo StPageFlip nếu người dùng đã sẵn sàng
        initFlipBook();
    });

    // 5. Khởi tạo StPageFlip
    function initFlipBook() {
        if (!window.St.PageFlip) {
            console.error('PageFlip library not loaded!');
            return;
        }

        const isMobile = window.innerWidth <= 800;

        pageFlipLib = new window.St.PageFlip(bookEl, {
            width: isMobile ? 320 : 400, // Chiều rộng 1 trang cơ bản (thu nhỏ cho mobile)
            height: isMobile ? 480 : 500, // Chiều cao 1 trang cơ bản
            size: "stretch", // Cho phép co dãn theo khung cha
            minWidth: 280,
            maxWidth: 500,
            minHeight: 380,
            maxHeight: 650,
            maxShadowOpacity: 0.8, // Tăng cường độ đổ bóng để giống sách hơn
            showCover: true,
            mobileScrollSupport: false, 
            usePortrait: true, // Bắt buộc portrait nếu màn hình cha (container) nhỏ hơn 2 page. Giúp force 1 page mode
            flippingTime: 800 // Tốc độ lật chậm hơn 1 chút để tạo cảm giác giấy thật
        });

        // Nạp HTML từ DOM
        pageFlipLib.loadFromHTML(document.querySelectorAll('.page'));

        // Sự kiện: Khi người dùng đang lật trang
        pageFlipLib.on('flip', (e) => {
            const orientation = pageFlipLib.getOrientation();
            const targetPage = e.data; // e.data luôn là index trang đích được lật tới

            // Phát lần lượt các trang nằm trong tầm nhìn
            if (orientation === 'landscape') {
                audioController.playSpread([targetPage, targetPage + 1]);
            } else {
                audioController.playSpread([targetPage]);
            }
        });

        // Cập nhật khi resize để kích hoạt lại layout 
        window.addEventListener('resize', () => {
            pageFlipLib.update();
        });
    }

});
