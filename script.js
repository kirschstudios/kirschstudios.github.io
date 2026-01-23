        // --- 1. CONFIGURATION ---
        let artists = [];
        let songs = [];

        // Helper function to get artist info
        function getArtist(artistId) {
            return artists.find(a => a.id === artistId);
        }

        // Helper function to get artist's songs
        function getArtistSongs(artistId) {
            return songs.filter(s => s.artistId === artistId);
        }

        // Helper function to get song's artist name
        function getArtistName(artistId) {
            const artist = getArtist(artistId);
            return artist ? artist.name : "Unknown Artist";
        }

        const audioPlayer = document.getElementById('mainAudio');
        let currentPlayingId = null; 
        let isDragging = false;
        let isShuffleMode = false;
        let playHistory = []; // Track play order for shuffle

        // --- 1b. LOAD DATA FROM JSON ---
        async function loadData() {
            try {
                const response = await fetch('data/data.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                artists = data.artists;
                songs = data.songs;
                
                // Initialize the app after data is loaded
                initializeApp();
            } catch (error) {
                console.error('Error loading data:', error);
                // Fallback to default data if JSON fails to load
                artists = [
                    {
                        id: 0,
                        name: "kirsch",
                        photo: "covers/Cazier.jpg",
                        bio: "Nu va comparati !!"
                    }
                ];
                songs = [
                    {
                        id: 0,
                        title: "CAZIER",
                        artistId: 0,
                        cover: "covers/Cazier.jpg",
                        url: "songs/Cazier.wav"
                    }
                ];
                
                // Initialize with fallback data
                initializeApp();
            }
        }

        // --- 2. PARTICLE SYSTEM (SCANLINES) ---
        function createParticles() {
            const container = document.getElementById('particlesContainer');
            if (!container) {
                console.error('particlesContainer not found!');
                return;
            }
            const particleCount = 15; // Fewer scanlines for cleaner look
            
            for(let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                
                // Random horizontal position
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = -100 + 'px';
                
                // Random animation delay
                particle.style.animationDelay = Math.random() * 15 + 's';
                particle.style.animationDuration = (10 + Math.random() * 10) + 's';
                
                container.appendChild(particle);
            }
        }

        // --- 2b. VOLUME CONTROL ---
        function setupVolumeControl(slider, id) {
            let isDraggingVolume = false;

            slider.addEventListener('mousedown', (e) => {
                isDraggingVolume = true;
                updateVolume(e, slider, id);
            });

            document.addEventListener('mousemove', (e) => {
                if (isDraggingVolume) {
                    updateVolume(e, slider, id);
                }
            });

            document.addEventListener('mouseup', () => {
                isDraggingVolume = false;
            });

            slider.addEventListener('click', (e) => {
                updateVolume(e, slider, id);
            });
        }

        function updateVolume(e, slider, id) {
            const rect = slider.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const width = rect.width;
            let percentage = Math.max(0, Math.min(1, offsetX / width));
            
            audioPlayer.volume = percentage;
            
            // Update all volume fills for this song
            const fills = document.querySelectorAll(`.volume-fill[data-id="${id}"]`);
            fills.forEach(fill => fill.style.width = `${percentage * 100}%`);
            
            // Update all volume icons for this song
            const btns = document.querySelectorAll(`.volume-btn[data-id="${id}"]`);
            btns.forEach(btn => {
                const icon = btn.querySelector('use');
                if (icon) {
                    if (percentage === 0) icon.setAttribute('href', '#icon-volume-x');
                    else if (percentage < 0.5) icon.setAttribute('href', '#icon-volume-1');
                    else icon.setAttribute('href', '#icon-volume-2');
                }
            });
        }

        // --- 3. VIEW SWITCHING ---
        function switchView(viewName, event) {
            // Update active nav item
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Find and activate the correct nav item
            if (event && event.target) {
                const navItem = event.target.closest('.nav-item');
                if (navItem) {
                    navItem.classList.add('active');
                }
            } else {
                // If called programmatically, find nav by view name
                const navItems = document.querySelectorAll('.nav-item');
                const navMap = {
                    'home': 0,
                    'discover': 1,
                    'artists': 2
                };
                if (navMap[viewName] !== undefined) {
                    navItems[navMap[viewName]].classList.add('active');
                }
            }

            // Hide all views and artist page
            document.querySelectorAll('.view').forEach(view => {
                view.classList.remove('active');
            });
            document.getElementById('artistPage').classList.remove('active');
            
            // Show the selected view
            document.getElementById(`view-${viewName}`).classList.add('active');
        }

        // --- 4. INITIAL RENDER ---
        function renderList() {
            renderSongsInContainer('songList', songs);
        }

        function renderSongsInContainer(containerId, songsToRender) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            container.innerHTML = ''; 
            songsToRender.forEach((song, index) => {
                const item = document.createElement('div');
                item.className = 'song-item initial-load';
                item.id = `song-${song.id}-${containerId}`;
                item.style.setProperty('--index', index);
                item.setAttribute('data-song-id', song.id);

                item.innerHTML = `
                    <div class="song-header" onclick="toggleSong(${song.id})">
                        <img src="${song.cover}" alt="cover" class="cover-art">
                        <div class="song-info">
                            <div class="song-title">${song.title}</div>
                            <div class="song-artist">${getArtistName(song.artistId)}</div>
                        </div>
                        <div class="play-btn-wrapper">
                            <span class="btn-icon" data-id="${song.id}" style="font-size: 1.2rem;">▶</span>
                        </div>
                    </div>
                    
                    <div class="expanded-player">
                        <div class="player-inner">
                            <div class="controls-row">
                                <div class="visualizer song-vis" data-id="${song.id}">
                                    <div class="v-bar"></div><div class="v-bar"></div><div class="v-bar"></div>
                                </div>
                                <span class="current-time" data-id="${song.id}">0:00</span>
                                
                                <div class="progress-track" data-id="${song.id}">
                                    <div class="progress-bar-bg">
                                        <div class="progress-fill" data-id="${song.id}">
                                            <div class="progress-thumb"></div>
                                        </div>
                                    </div>
                                </div>

                                <span class="duration-time" data-id="${song.id}">0:00</span>
                                <button class="loop-btn" data-id="${song.id}" onclick="toggleLoop(event, ${song.id})" title="Loop">↻</button>
                                
                                <div class="volume-control">
                                    <button class="volume-btn" data-id="${song.id}" title="Volume">
                                        <svg class="icon"><use href="#icon-volume-2"></use></svg>
                                    </button>
                                    <div class="volume-slider" data-id="${song.id}">
                                        <div class="volume-fill" data-id="${song.id}">
                                            <div class="volume-thumb"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(item);

                const track = item.querySelector(`.progress-track[data-id="${song.id}"]`);
                setupDragListeners(track, song.id);
                
                const volumeSlider = item.querySelector(`.volume-slider[data-id="${song.id}"]`);
                setupVolumeControl(volumeSlider, song.id);
            });
        }

        // --- 3. DRAG PHYSICS ---
        function setupDragListeners(track, id) {
            track.addEventListener('mousedown', (e) => {
                if(currentPlayingId !== id) return;
                isDragging = true;
                track.classList.add('dragging');
                updateBarVisuals(e, track, id);
            });

            document.addEventListener('mousemove', (e) => {
                if (isDragging && currentPlayingId === id) {
                    updateBarVisuals(e, track, id);
                }
            });

            document.addEventListener('mouseup', (e) => {
                if (isDragging && currentPlayingId === id) {
                    isDragging = false;
                    track.classList.remove('dragging');
                    const rect = track.getBoundingClientRect();
                    const offsetX = e.clientX - rect.left;
                    const width = rect.width;
                    let percentage = offsetX / width;
                    percentage = Math.max(0, Math.min(1, percentage)); 
                    if (audioPlayer.duration) audioPlayer.currentTime = percentage * audioPlayer.duration;
                }
            });
        }

        function updateBarVisuals(e, track, id) {
            const rect = track.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const width = rect.width;
            let percentage = offsetX / width;
            percentage = Math.max(0, Math.min(1, percentage));

            const fills = document.querySelectorAll(`.progress-fill[data-id="${id}"]`);
            fills.forEach(fill => fill.style.width = `${percentage * 100}%`);
            
            const timeSpans = document.querySelectorAll(`.current-time[data-id="${id}"]`);
            if (audioPlayer.duration) {
                timeSpans.forEach(span => span.innerText = formatTime(percentage * audioPlayer.duration));
            }
        }

        // --- 4. PLAYER LOGIC ---
        function toggleSong(id) {
            const clickedItems = document.querySelectorAll(`[data-song-id="${id}"]`);
            
            // Ripple effect on all instances
            clickedItems.forEach(item => {
                item.classList.remove('ripple');
                void item.offsetWidth;
                item.classList.add('ripple');
                setTimeout(() => item.classList.remove('ripple'), 600);
            });
            
            if (currentPlayingId === id) {
                if (audioPlayer.paused) {
                    audioPlayer.play();
                    updateIcon(id, 'pause');
                    toggleVisualizer(id, true);
                    document.getElementById('playPauseIcon').innerText = '⏸';
                } else {
                    audioPlayer.pause();
                    updateIcon(id, 'play');
                    toggleVisualizer(id, false);
                    document.getElementById('playPauseIcon').innerText = '▶';
                }
                return;
            }

            // Reset previous active song
            if (currentPlayingId !== null) {
                const prevItems = document.querySelectorAll(`[data-song-id="${currentPlayingId}"]`);
                prevItems.forEach(item => {
                    item.classList.remove('active');
                    item.style.removeProperty('--bg-image');
                });
                
                updateIcon(currentPlayingId, 'play');
                toggleVisualizer(currentPlayingId, false);
                
                audioPlayer.loop = false;
                const prevLoopBtns = document.querySelectorAll(`.loop-btn[data-id="${currentPlayingId}"]`);
                prevLoopBtns.forEach(btn => btn.classList.remove('active-loop'));
            }

            // Set new song
            currentPlayingId = id;
            const song = songs.find(s => s.id === id);
            audioPlayer.src = song.url;
            
            const newItems = document.querySelectorAll(`[data-song-id="${id}"]`);
            
            // Inject the cover image URL into all instances
            newItems.forEach(item => {
                item.style.setProperty('--bg-image', `url('${song.cover}')`);
                item.classList.add('active');
            });
            
            updateIcon(id, 'pause');
            toggleVisualizer(id, true);

            audioPlayer.play();
            updateBottomPlayer();
            document.getElementById('playPauseIcon').innerText = '⏸';
            
            // Track play history
            playHistory.push(id);
            updateNavigationButtons();
        }

        function toggleVisualizer(id, show) {
            const vis = document.querySelectorAll(`.song-vis[data-id="${id}"]`);
            vis.forEach(v => v.style.opacity = show ? '1' : '0');
        }

        function toggleLoop(event, id) {
            event.stopPropagation();
            if (currentPlayingId !== id) return;
            const btns = document.querySelectorAll(`.loop-btn[data-id="${id}"]`);
            audioPlayer.loop = !audioPlayer.loop;
            btns.forEach(btn => {
                if (audioPlayer.loop) btn.classList.add('active-loop');
                else btn.classList.remove('active-loop');
            });
        }

        function updateIcon(id, state) {
            const btns = document.querySelectorAll(`.btn-icon[data-id="${id}"]`);
            btns.forEach(btn => btn.innerText = state === 'play' ? '▶' : '⏸');
        }

        function formatTime(seconds) {
            if(isNaN(seconds)) return "0:00";
            const min = Math.floor(seconds / 60);
            const sec = Math.floor(seconds % 60);
            return `${min}:${sec < 10 ? '0' : ''}${sec}`;
        }

        // --- 5. AUDIO UPDATES ---
        audioPlayer.addEventListener('timeupdate', () => {
            if (currentPlayingId === null || isDragging) return;
            const cur = audioPlayer.currentTime;
            const dur = audioPlayer.duration;
            const percentage = (cur / dur) * 100;
            
            const fills = document.querySelectorAll(`.progress-fill[data-id="${currentPlayingId}"]`);
            const timeSpans = document.querySelectorAll(`.current-time[data-id="${currentPlayingId}"]`);
            const durSpans = document.querySelectorAll(`.duration-time[data-id="${currentPlayingId}"]`);
            
            fills.forEach(fill => fill.style.width = `${percentage}%`);
            timeSpans.forEach(span => span.innerText = formatTime(cur));
            durSpans.forEach(span => span.innerText = formatTime(dur));
            
            // Update bottom player
            if (!isBottomDragging) {
                bottomProgressFill.style.width = `${percentage}%`;
                bottomCurrentTime.innerText = formatTime(cur);
                bottomDuration.innerText = formatTime(dur);
            }
            
            // Update Media Session position state for native controls
            updateMediaSessionPositionState();
        });

        audioPlayer.addEventListener('ended', () => {
            if (!audioPlayer.loop && currentPlayingId !== null) {
                const endedItems = document.querySelectorAll(`[data-song-id="${currentPlayingId}"]`);
                endedItems.forEach(item => {
                    item.classList.remove('active');
                    item.style.removeProperty('--bg-image');
                });
                
                updateIcon(currentPlayingId, 'play');
                toggleVisualizer(currentPlayingId, false);
                
                currentPlayingId = null;
                updateBottomPlayer();
                document.getElementById('playPauseIcon').innerText = '▶';
                updateNavigationButtons();
            }
        });

        // Update media session when metadata is loaded (duration is available)
        audioPlayer.addEventListener('loadedmetadata', () => {
            if (currentPlayingId !== null) {
                updateMediaSessionPositionState();
            }
        });

        // --- 6. BOTTOM PLAYER FUNCTIONS ---
        const bottomPlayer = document.getElementById('bottomPlayer');
        const bottomLoopBtn = document.getElementById('bottomLoopBtn');
        const bottomProgressTrack = document.getElementById('bottomProgressTrack');
        const bottomProgressFill = document.getElementById('bottomProgressFill');
        const bottomCurrentTime = document.getElementById('bottomCurrentTime');
        const bottomDuration = document.getElementById('bottomDuration');
        const bottomCover = document.getElementById('bottomCover');
        const bottomTitle = document.getElementById('bottomTitle');
        const bottomArtist = document.getElementById('bottomArtist');
        const bottomVolumeSlider = document.getElementById('bottomVolumeSlider');
        const bottomVolumeFill = document.getElementById('bottomVolumeFill');
        const bottomVolumeBtn = document.getElementById('bottomVolumeBtn');

        function updateBottomPlayer() {
            if (currentPlayingId !== null) {
                const song = songs.find(s => s.id === currentPlayingId);
                bottomPlayer.classList.add('active');
                bottomCover.src = song.cover;
                bottomTitle.innerText = song.title;
                bottomArtist.innerText = getArtistName(song.artistId);
                
                // Update Media Session API for native mobile controls
                updateMediaSession(song);
            } else {
                bottomPlayer.classList.remove('active');
                // Clear media session when no song is playing
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.metadata = null;
                }
            }
        }

        // --- MEDIA SESSION API for Mobile Native Controls ---
        function updateMediaSession(song) {
            if ('mediaSession' in navigator) {
                const artistName = getArtistName(song.artistId);
                
                // Set metadata (title, artist, album, artwork)
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: song.title,
                    artist: artistName,
                    album: 'Kirsch Studios',
                    artwork: [
                        { src: song.cover, sizes: '512x512', type: 'image/jpeg' },
                        { src: song.cover, sizes: '256x256', type: 'image/jpeg' },
                        { src: song.cover, sizes: '128x128', type: 'image/jpeg' },
                        { src: song.cover, sizes: '96x96', type: 'image/jpeg' }
                    ]
                });

                // Set up action handlers for native controls
                navigator.mediaSession.setActionHandler('play', () => {
                    audioPlayer.play();
                    updateIcon(currentPlayingId, 'pause');
                    toggleVisualizer(currentPlayingId, true);
                    document.getElementById('playPauseIcon').innerText = '⏸';
                });

                navigator.mediaSession.setActionHandler('pause', () => {
                    audioPlayer.pause();
                    updateIcon(currentPlayingId, 'play');
                    toggleVisualizer(currentPlayingId, false);
                    document.getElementById('playPauseIcon').innerText = '▶';
                });

                navigator.mediaSession.setActionHandler('previoustrack', () => {
                    bottomPrevious();
                });

                navigator.mediaSession.setActionHandler('nexttrack', () => {
                    bottomNext();
                });

                // Seek controls for the native progress bar
                navigator.mediaSession.setActionHandler('seekto', (details) => {
                    if (details.seekTime && audioPlayer.duration) {
                        audioPlayer.currentTime = details.seekTime;
                    }
                });

                navigator.mediaSession.setActionHandler('seekbackward', (details) => {
                    const skipTime = details.seekOffset || 10;
                    audioPlayer.currentTime = Math.max(audioPlayer.currentTime - skipTime, 0);
                });

                navigator.mediaSession.setActionHandler('seekforward', (details) => {
                    const skipTime = details.seekOffset || 10;
                    audioPlayer.currentTime = Math.min(audioPlayer.currentTime + skipTime, audioPlayer.duration);
                });

                // Update position state for seek bar
                updateMediaSessionPositionState();
            }
        }

        // Update the position state for the native seek bar
        function updateMediaSessionPositionState() {
            if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
                if (audioPlayer.duration && !isNaN(audioPlayer.duration)) {
                    navigator.mediaSession.setPositionState({
                        duration: audioPlayer.duration,
                        playbackRate: audioPlayer.playbackRate,
                        position: audioPlayer.currentTime
                    });
                }
            }
        }

        function bottomTogglePlay() {
            if (currentPlayingId !== null) {
                const playPauseIcon = document.getElementById('playPauseIcon');
                if (audioPlayer.paused) {
                    audioPlayer.play();
                    playPauseIcon.innerText = '⏸';
                    updateIcon(currentPlayingId, 'pause');
                    toggleVisualizer(currentPlayingId, true);
                } else {
                    audioPlayer.pause();
                    playPauseIcon.innerText = '▶';
                    updateIcon(currentPlayingId, 'play');
                    toggleVisualizer(currentPlayingId, false);
                }
            }
        }

        function bottomToggleLoop() {
            if (currentPlayingId !== null) {
                audioPlayer.loop = !audioPlayer.loop;
                if (audioPlayer.loop) {
                    bottomLoopBtn.classList.add('active-loop');
                } else {
                    bottomLoopBtn.classList.remove('active-loop');
                }
                // Sync with card loop buttons
                const loopBtns = document.querySelectorAll(`.loop-btn[data-id="${currentPlayingId}"]`);
                loopBtns.forEach(btn => {
                    if (audioPlayer.loop) btn.classList.add('active-loop');
                    else btn.classList.remove('active-loop');
                });
            }
        }

        function bottomToggleShuffle() {
            isShuffleMode = !isShuffleMode;
            const shuffleBtn = document.getElementById('bottomShuffleBtn');
            if (isShuffleMode) {
                shuffleBtn.classList.add('active-shuffle');
            } else {
                shuffleBtn.classList.remove('active-shuffle');
            }
            updateNavigationButtons();
        }

        function bottomPrevious() {
            if (playHistory.length > 1) {
                // Remove current song
                playHistory.pop();
                // Get previous song
                const prevId = playHistory[playHistory.length - 1];
                playHistory.pop(); // Remove it so toggleSong can add it back
                toggleSong(prevId);
            }
        }

        function bottomNext() {
            if (currentPlayingId === null) return;
            
            let nextId;
            if (isShuffleMode) {
                // Random song that's not the current one
                const availableSongs = songs.filter(s => s.id !== currentPlayingId);
                const randomSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
                nextId = randomSong.id;
            } else {
                // Get next song in order
                const currentIndex = songs.findIndex(s => s.id === currentPlayingId);
                if (currentIndex < songs.length - 1) {
                    nextId = songs[currentIndex + 1].id;
                } else {
                    return; // No next song
                }
            }
            
            toggleSong(nextId);
        }

        function updateNavigationButtons() {
            const prevBtn = document.getElementById('bottomPrevBtn');
            const nextBtn = document.getElementById('bottomNextBtn');
            
            // Previous button: enabled if we have history
            if (playHistory.length > 1) {
                prevBtn.disabled = false;
            } else {
                prevBtn.disabled = true;
            }
            
            // Next button: always enabled in shuffle, or if not last song
            if (isShuffleMode || songs.length === 0) {
                nextBtn.disabled = false;
            } else {
                const currentIndex = songs.findIndex(s => s.id === currentPlayingId);
                if (currentIndex >= songs.length - 1) {
                    nextBtn.disabled = true;
                } else {
                    nextBtn.disabled = false;
                }
            }
        }

        // Bottom player progress dragging
        let isBottomDragging = false;
        bottomProgressTrack.addEventListener('mousedown', (e) => {
            if (currentPlayingId === null) return;
            isBottomDragging = true;
            updateBottomProgress(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (isBottomDragging) updateBottomProgress(e);
        });

        document.addEventListener('mouseup', (e) => {
            if (isBottomDragging) {
                isBottomDragging = false;
                const rect = bottomProgressTrack.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                const width = rect.width;
                let percentage = Math.max(0, Math.min(1, offsetX / width));
                if (audioPlayer.duration) audioPlayer.currentTime = percentage * audioPlayer.duration;
            }
        });

        function updateBottomProgress(e) {
            const rect = bottomProgressTrack.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const width = rect.width;
            let percentage = Math.max(0, Math.min(1, offsetX / width));
            bottomProgressFill.style.width = `${percentage * 100}%`;
            if (audioPlayer.duration) {
                bottomCurrentTime.innerText = formatTime(percentage * audioPlayer.duration);
            }
        }

        // Bottom player volume control
        setupBottomVolume();
        
        function setupBottomVolume() {
            let isDraggingVolume = false;

            bottomVolumeSlider.addEventListener('mousedown', (e) => {
                isDraggingVolume = true;
                updateBottomVolume(e);
            });

            document.addEventListener('mousemove', (e) => {
                if (isDraggingVolume) updateBottomVolume(e);
            });

            document.addEventListener('mouseup', () => {
                isDraggingVolume = false;
            });

            bottomVolumeSlider.addEventListener('click', (e) => {
                updateBottomVolume(e);
            });
        }

        function updateBottomVolume(e) {
            const rect = bottomVolumeSlider.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const width = rect.width;
            let percentage = Math.max(0, Math.min(1, offsetX / width));
            
            audioPlayer.volume = percentage;
            bottomVolumeFill.style.width = `${percentage * 100}%`;
            
            // Update bottom volume icon
            const bottomIcon = bottomVolumeBtn.querySelector('use');
            if (bottomIcon) {
                if (percentage === 0) bottomIcon.setAttribute('href', '#icon-volume-x');
                else if (percentage < 0.5) bottomIcon.setAttribute('href', '#icon-volume-1');
                else bottomIcon.setAttribute('href', '#icon-volume-2');
            }
            
            // Sync with all other volume controls
            const allVolumeFills = document.querySelectorAll('.volume-fill');
            allVolumeFills.forEach(fill => fill.style.width = `${percentage * 100}%`);
            const allVolumeBtns = document.querySelectorAll('.volume-btn');
            allVolumeBtns.forEach(btn => {
                const icon = btn.querySelector('use');
                if (icon) {
                    if (percentage === 0) icon.setAttribute('href', '#icon-volume-x');
                    else if (percentage < 0.5) icon.setAttribute('href', '#icon-volume-1');
                    else icon.setAttribute('href', '#icon-volume-2');
                }
            });
        }

        // --- 7. ARTISTS VIEW ---
        function renderArtists() {
            const artistsGrid = document.getElementById('artistsGrid');
            if (!artistsGrid) return;
            
            artistsGrid.innerHTML = '';
            artists.forEach((artist, index) => {
                const songCount = getArtistSongs(artist.id).length;
                const card = document.createElement('div');
                card.className = 'artist-card';
                card.style.setProperty('--index', index);
                card.onclick = () => openArtistPage(artist.id);
                
                card.innerHTML = `
                    <div class="artist-photo-wrapper">
                        <img src="${artist.photo}" alt="${artist.name}" class="artist-photo">
                    </div>
                    <div class="artist-info">
                        <div class="artist-name">${artist.name}</div>
                        <div class="artist-song-count">${songCount} ${songCount === 1 ? 'song' : 'songs'}</div>
                    </div>
                `;
                
                artistsGrid.appendChild(card);
            });
        }

        // --- 8. ARTIST PAGE ---
        function openArtistPage(artistId) {
            const artist = getArtist(artistId);
            const artistSongs = getArtistSongs(artistId);
            const artistPage = document.getElementById('artistPage');
            
            // Hide all views and show artist page
            document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            artistPage.classList.remove('active'); // Remove first to trigger animation
            
            // Build artist page
            artistPage.innerHTML = `
                <div class="artist-header">
                    <div class="artist-header-content">
                        <img src="${artist.photo}" alt="${artist.name}" class="artist-header-photo">
                        <div class="artist-header-info">
                            <div class="artist-label">Artist</div>
                            <h1 class="artist-header-name">${artist.name}</h1>
                            <p class="artist-bio">${artist.bio}</p>
                            <div class="artist-stats">${artistSongs.length} ${artistSongs.length === 1 ? 'song' : 'songs'}</div>
                        </div>
                    </div>
                </div>
                <div class="artist-songs-section">
                    <button class="back-btn" onclick="closeArtistPage()">
                        <svg class="icon"><use href="#icon-skip-back"></use></svg>
                        Back to Artists
                    </button>
                    <h2 class="artist-songs-title">Songs</h2>
                    <div class="song-list" id="artistSongList"></div>
                </div>
            `;
            
            // Show artist page
            artistPage.classList.add('active');
            
            // Render artist's songs
            renderSongsInContainer('artistSongList', artistSongs);
        }

        function closeArtistPage() {
            const artistPage = document.getElementById('artistPage');
            artistPage.classList.remove('active');
            
            // Show artists view
            document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            document.getElementById('view-artists').classList.add('active');
            
            // Update nav
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelectorAll('.nav-item')[2].classList.add('active'); // Artists is 3rd item (index 2)
        }

        // --- 9. POPULAR CONTENT ---
        function renderPopularContent() {
            const popularContent = document.getElementById('popularContent');
            if (!popularContent) return;
            
            popularContent.innerHTML = '';
            
            // Get popular song (first song for now, you can add logic later)
            const popularSong = songs[0];
            if (popularSong) {
                const songCard = document.createElement('div');
                songCard.className = 'popular-song-card';
                songCard.onclick = () => {
                    switchView('discover');
                    setTimeout(() => toggleSong(popularSong.id), 300);
                };
                
                songCard.innerHTML = `
                    <div class="popular-badge">🔥 Hot</div>
                    <img src="${popularSong.cover}" alt="${popularSong.title}" class="popular-cover">
                    <h3 class="popular-title">${popularSong.title}</h3>
                    <p class="popular-subtitle">${getArtistName(popularSong.artistId)}</p>
                `;
                
                popularContent.appendChild(songCard);
            }
            
            // Get popular artist (first artist for now)
            const popularArtist = artists[0];
            if (popularArtist) {
                const artistCard = document.createElement('div');
                artistCard.className = 'popular-artist-card';
                artistCard.onclick = () => openArtistPage(popularArtist.id);
                
                const songCount = getArtistSongs(popularArtist.id).length;
                artistCard.innerHTML = `
                    <div class="popular-badge">⭐ Featured</div>
                    <img src="${popularArtist.photo}" alt="${popularArtist.name}" class="popular-artist-photo">
                    <h3 class="popular-title">${popularArtist.name}</h3>
                    <p class="popular-subtitle">${songCount} ${songCount === 1 ? 'song' : 'songs'}</p>
                `;
                
                popularContent.appendChild(artistCard);
            }
        }

        // Initialize app after data is loaded
        function initializeApp() {
            createParticles();
            renderList();
            renderArtists();
            renderPopularContent();
            updateNavigationButtons();
        }

        // Load data and start the app
        // --- FIX DOUBLE-TAP ISSUE ON MOBILE ---
        // Prevent hover-first-click-second behavior on touch devices
        if ('ontouchstart' in window) {
            document.addEventListener('touchstart', function() {}, {passive: true});
        }

        loadData();
    
