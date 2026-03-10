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

            // Tua nhạc (hỗ trợ cả Click chuột và Touch trên Mobile)
            const handleSeek = (e) => {
                if (!currentAudio) return;
                
                // Lấy tọa độ bounding box của thanh progress
                const rect = progressContainer.getBoundingClientRect();
                
                // Phân biệt Touch Event và Mouse Event
                let clientX;
                if (e.type.startsWith('touch')) {
                    clientX = e.changedTouches[0].clientX;
                } else {
                    clientX = e.clientX;
                }

                // Tính toán vị trí tương đối
                const clickX = clientX - rect.left;
                const width = rect.width;
                
                // Tránh giá trị âm hoặc lố ra ngoài do ngón tay chạm lem
                const boundedX = Math.max(0, Math.min(clickX, width));

                const duration = currentAudio.duration;
                if (!isNaN(duration)) {
                    currentAudio.currentTime = (boundedX / width) * duration;
                }
            };

            progressContainer.addEventListener('mousedown', handleSeek);
            progressContainer.addEventListener('touchstart', handleSeek, {passive: true});

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

    // Hàm Unlock Audio cho iPhone / Mobile: Phải play/pause toàn bộ thẻ âm thanh trong event tương tác ĐẦU TIÊN
    // Nếu không đợi tới lúc lật trang, Safari iOS sẽ chặn việc play() vì không sinh ra trực tiếp bởi DOM Event chạm tay
    function unlockAudioForMobile() {
        if (isUserActive) return; // Chỉ chạy 1 lần
        
        // Xin quyền phát cho TẤT CẢ các file âm thanh đã được load (dù chưa lật tới)
        for (const index in audioController.audios) {
            const tempAudio = audioController.audios[index];
            tempAudio.muted = true; // Mute tránh tiếng bùm chíu 
            const p = tempAudio.play();
            if (p !== undefined) {
                p.then(() => {
                    tempAudio.pause();
                    tempAudio.currentTime = 0;
                    tempAudio.muted = false; // Mở âm lại cho lần phát chính thức
                }).catch(err => {
                    tempAudio.muted = false;
                    console.log("Audio unlock failed for index", index, err);
                });
            }
        }
    }

    // 4. Bắt đầu - Mở sách
    startBtn.addEventListener('click', () => {
        unlockAudioForMobile();
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
            width: isMobile ? 320 : 400, // Chiều rộng 1 trang cơ bản
            height: isMobile ? 454 : 567, // Chiều cao 1 trang cơ bản (Chuẩn tỷ lệ A4 ~ 1:1.417 của PDF)
            size: "stretch", // Cho phép co dãn theo khung cha
            minWidth: 280,
            maxWidth: 500,
            minHeight: 396,
            maxHeight: 708,
            maxShadowOpacity: 0.8, // Tăng cường độ đổ bóng để giống sách hơn
            showCover: true,
            mobileScrollSupport: false, 
            usePortrait: true, // Bắt buộc portrait nếu màn hình cha (container) nhỏ hơn 2 page. Giúp force 1 page mode
            flippingTime: 400, // Tăng tốc độ lật trang (Giảm từ 800 xuống 400ms)
            swipeDistance: 15, // Tăng độ nhạy chạm vuốt (Giảm quãng đường phải vuốt trên Mobile)
            useMouseEvents: true, // Cho phép dùng chuột tương tác
            clickEventForward: true // Cho phép chạm vào mép màn hình để lật (Click to flip)
        });

        // Nạp HTML từ DOM
        pageFlipLib.loadFromHTML(document.querySelectorAll('.page'));

        // Cấu hình phím mũi tên lật sách trên Desktop
        document.addEventListener("keydown", (e) => {
            if (!pageFlipLib) return;
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                pageFlipLib.flipNext(); // Qua trang
            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                pageFlipLib.flipPrev(); // Lùi trang
            }
        });

        // Bổ sung: Bắt sự kiện Tap (Nhấp màn hình) tinh chuẩn cho thiết bị di động
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let isSwiping = false;

        bookEl.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
            touchStartTime = Date.now();
            isSwiping = false;
        }, {passive: true});

        bookEl.addEventListener('touchmove', (e) => {
            isSwiping = true; // Nếu tay xê dịch liên tục thì coi là đang vuốt
        }, {passive: true});

        bookEl.addEventListener('touchend', (e) => {
            if (!pageFlipLib || pageFlipLib.getFlipState() !== 'read') return;
            
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            const duration = Date.now() - touchStartTime;

            // Nếu chạm nhả ngắn (dưới 350ms) và không di dịch ngón tay (dưới 15px) => Đây chính là thao tác CHẠM (Tap) chứ không phải Vuốt (Swipe)
            if (!isSwiping && duration < 350 && Math.abs(touchEndX - touchStartX) < 15 && Math.abs(touchEndY - touchStartY) < 15) {
                const rect = bookEl.getBoundingClientRect();
                const clickX = e.changedTouches[0].clientX - rect.left;
                
                // Chia đôi màn hình: Chạm nửa bên trái => Lùi, Chạm nửa bên phải => Tới
                if (clickX < rect.width / 2) {
                    pageFlipLib.flipPrev();
                } else {
                    pageFlipLib.flipNext();
                }
            }
        });

        // Click bình thường giữ lại cho chuột PC
        bookEl.addEventListener('click', (e) => {
            if (e.pointerType === 'touch') return; // Mobile thì xử lý ở trên rồi
            if (!pageFlipLib || pageFlipLib.getFlipState() !== 'read') return;
            
            const rect = bookEl.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            if (clickX < rect.width / 2) {
                pageFlipLib.flipPrev();
            } else {
                pageFlipLib.flipNext();
            }
        });

        // Sự kiện: Khi người dùng đang lật trang
        pageFlipLib.on('flip', (e) => {
            const orientation = pageFlipLib.getOrientation();
            const targetPage = e.data; // e.data luôn là index trang đích được lật tới
            const totalPages = document.querySelectorAll('.page').length;

            // Phát lần lượt các trang nằm trong tầm nhìn
            if (orientation === 'landscape') {
                if (targetPage === 0) {
                    // Nếu là bìa sách đóng (chỉ nhìn thấy mặt 0), không được phát nhạc mặt trong (trang 1)
                    audioController.playSpread([0]);
                } else if (targetPage === totalPages - 1) {
                    // Nếu là bìa sau cùng
                    audioController.playSpread([targetPage]);
                } else {
                    audioController.playSpread([targetPage, targetPage + 1]);
                }
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
