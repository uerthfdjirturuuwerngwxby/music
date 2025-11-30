// YouTube Music Player with Enhanced Ad-Blocking
class MusicPlayer {
    constructor() {
        // Hardcoded API Key - User provided
        this.API_KEY = 'AIzaSyB6U14mNlMibdE0Wop8WQ0WntaFMVFJR-E';
        this.player = null;
        this.currentVideoIndex = 0;
        this.searchResults = [];
        this.blockedVideos = [];
        this.isPlaying = false;
        this.progressInterval = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadYouTubeAPI();
        
        // Auto-search after a short delay
        setTimeout(() => {
            this.performSearch();
        }, 1000);
    }

    setupEventListeners() {
        // Search
        document.getElementById('searchBtn').addEventListener('click', () => this.performSearch());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });

        // Player controls
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('prevBtn').addEventListener('click', () => this.playPrevVideo());
        document.getElementById('nextBtn').addEventListener('click', () => this.playNextVideo());
        document.getElementById('skipBackwardBtn').addEventListener('click', () => this.skipBackward());
        document.getElementById('skipForwardBtn').addEventListener('click', () => this.skipForward());
        document.getElementById('clearPlaylist').addEventListener('click', () => this.clearPlaylist());

        // Progress bar
        document.getElementById('progressContainer').addEventListener('click', (e) => this.seekToPosition(e));
    }

    loadYouTubeAPI() {
        // YouTube API is loaded via script tag in HTML
        window.onYouTubeIframeAPIReady = () => {
            this.player = new YT.Player('player', {
                height: '100%',
                width: '100%',
                videoId: '',
                playerVars: {
                    'playsinline': 1,
                    'controls': 0,
                    'modestbranding': 1,
                    'rel': 0,
                    'showinfo': 0,
                    'iv_load_policy': 3,
                    'fs': 0
                },
                events: {
                    'onReady': (event) => this.onPlayerReady(event),
                    'onStateChange': (event) => this.onPlayerStateChange(event),
                    'onError': (event) => this.onPlayerError(event)
                }
            });
        };
    }

    onPlayerReady(event) {
        console.log("YouTube Player Ready");
        if (window.adBlocker) {
            window.adBlocker.log('YouTube player initialized with ad-blocking');
        }
        
        // Auto-play the first song when ready
        if (this.searchResults.length > 0) {
            setTimeout(() => {
                this.player.playVideo();
            }, 1000);
        }
    }

    onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.ENDED) {
            this.playNextVideo();
        }

        if (event.data === YT.PlayerState.PLAYING) {
            this.isPlaying = true;
            document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i> Pause';
            this.startProgressTracking();
            
            if (window.adBlocker && this.searchResults[this.currentVideoIndex]) {
                window.adBlocker.log(`Now playing: ${this.searchResults[this.currentVideoIndex].title}`);
            }
        } else {
            this.isPlaying = false;
            document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i> Play';
            this.stopProgressTracking();
        }

        if (event.data === YT.PlayerState.PLAYING) {
            document.getElementById('errorMessage').style.display = 'none';
        }
    }

    onPlayerError(event) {
        console.error('Player error:', event.data);
        document.getElementById('errorText').textContent = this.getErrorMessage(event.data);
        document.getElementById('errorMessage').style.display = 'block';

        if (this.searchResults[this.currentVideoIndex]) {
            this.blockedVideos.push(this.searchResults[this.currentVideoIndex].id);
            this.updatePlaylistUI();
            
            if (window.adBlocker) {
                window.adBlocker.log(`Video blocked: ${this.searchResults[this.currentVideoIndex].title}`, 'error');
            }
            
            // Auto-skip to next video
            setTimeout(() => this.playNextVideo(), 2000);
        }
    }

    getErrorMessage(errorCode) {
        switch (errorCode) {
            case 2: return "Invalid parameter values.";
            case 5: return "Content cannot be played in HTML5 player.";
            case 100: return "Video not found.";
            case 101:
            case 150: return "Video cannot be played on this website.";
            default: return "Unknown error occurred.";
        }
    }

    togglePlayPause() {
        if (this.player && this.player.getPlayerState) {
            if (this.player.getPlayerState() === YT.PlayerState.PLAYING) {
                this.player.pauseVideo();
            } else {
                this.player.playVideo();
            }
        }
    }

    skipBackward() {
        if (this.player && this.player.getCurrentTime) {
            const currentTime = this.player.getCurrentTime();
            this.player.seekTo(currentTime - 10, true);
        }
    }

    skipForward() {
        if (this.player && this.player.getCurrentTime) {
            const currentTime = this.player.getCurrentTime();
            this.player.seekTo(currentTime + 10, true);
        }
    }

    playPrevVideo() {
        if (this.searchResults.length > 0) {
            let prevIndex = (this.currentVideoIndex - 1 + this.searchResults.length) % this.searchResults.length;
            let attempts = 0;

            while (attempts < this.searchResults.length && 
                   this.blockedVideos.includes(this.searchResults[prevIndex].id)) {
                prevIndex = (prevIndex - 1 + this.searchResults.length) % this.searchResults.length;
                attempts++;
            }

            if (attempts < this.searchResults.length) {
                this.currentVideoIndex = prevIndex;
                this.player.loadVideoById(this.searchResults[this.currentVideoIndex].id);
                this.updatePlaylistUI();
                this.updateNowPlaying();
            }
        }
    }

    playNextVideo() {
        if (this.searchResults.length > 0) {
            let nextIndex = (this.currentVideoIndex + 1) % this.searchResults.length;
            let attempts = 0;

            while (attempts < this.searchResults.length && 
                   this.blockedVideos.includes(this.searchResults[nextIndex].id)) {
                nextIndex = (nextIndex + 1) % this.searchResults.length;
                attempts++;
            }

            if (attempts < this.searchResults.length) {
                this.currentVideoIndex = nextIndex;
                this.player.loadVideoById(this.searchResults[this.currentVideoIndex].id);
                this.updatePlaylistUI();
                this.updateNowPlaying();
            }
        }
    }

    startProgressTracking() {
        this.stopProgressTracking();
        this.progressInterval = setInterval(() => this.updateProgress(), 1000);
    }

    stopProgressTracking() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
    }

    updateProgress() {
        if (this.player && this.player.getCurrentTime && this.player.getDuration) {
            const currentTime = this.player.getCurrentTime();
            const duration = this.player.getDuration();

            document.getElementById('currentTime').textContent = this.formatTime(currentTime);
            document.getElementById('duration').textContent = this.formatTime(duration);

            const progress = (currentTime / duration) * 100;
            document.getElementById('progressBar').style.width = `${progress}%`;
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    seekToPosition(e) {
        if (this.player && this.player.getDuration) {
            const progressContainer = document.getElementById('progressContainer');
            const clickPosition = e.offsetX / progressContainer.offsetWidth;
            const duration = this.player.getDuration();
            const seekTime = duration * clickPosition;
            this.player.seekTo(seekTime, true);
        }
    }

    async performSearch() {
        const query = document.getElementById('searchInput').value.trim() || 'lofi study music';
        
        document.getElementById('playlistItems').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching YouTube...</div>';
        document.getElementById('errorMessage').style.display = 'none';

        try {
            // Search for videos
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(query + " music")}&type=video&key=${this.API_KEY}`;
            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();

            if (searchData.error) {
                throw new Error(searchData.error.message || 'API Error');
            }

            if (!searchData.items || searchData.items.length === 0) {
                document.getElementById('playlistItems').innerHTML = '<div class="error">No results found. Try a different search.</div>';
                return;
            }

            // Get video details
            const videoIds = searchData.items.map(item => item.id.videoId).join(',');
            const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${this.API_KEY}`;
            const detailsResponse = await fetch(detailsUrl);
            const detailsData = await detailsResponse.json();

            this.searchResults = searchData.items.map(item => {
                const videoDetails = detailsData.items.find(detail => detail.id === item.id.videoId);
                return {
                    id: item.id.videoId,
                    title: item.snippet.title,
                    thumbnail: item.snippet.thumbnails.medium.url,
                    channel: item.snippet.channelTitle,
                    duration: this.formatDuration(videoDetails ? videoDetails.contentDetails.duration : 'PT0M0S')
                };
            });

            this.blockedVideos = [];
            this.renderPlaylist();

            if (this.searchResults.length > 0) {
                this.currentVideoIndex = 0;
                if (this.player && this.player.loadVideoById) {
                    this.player.loadVideoById(this.searchResults[this.currentVideoIndex].id);
                    this.updatePlaylistUI();
                    this.updateNowPlaying();
                    
                    if (window.adBlocker) {
                        window.adBlocker.log(`Loaded playlist: ${this.searchResults.length} songs found`);
                    }
                    
                    // Auto-play after a short delay
                    setTimeout(() => {
                        if (this.player && this.player.playVideo) {
                            this.player.playVideo();
                        }
                    }, 1500);
                }
            }
        } catch (error) {
            console.error('Search error:', error);
            let errorMessage = `Error: ${error.message}`;
            
            if (error.message.includes('quota')) {
                errorMessage = 'YouTube API quota exceeded. Try again tomorrow.';
            } else if (error.message.includes('key')) {
                errorMessage = 'Invalid API key. Please check your YouTube API key.';
            }
            
            document.getElementById('playlistItems').innerHTML = `<div class="error">${errorMessage}</div>`;
            
            if (window.adBlocker) {
                window.adBlocker.log(`Search error: ${error.message}`, 'error');
            }
        }
    }

    formatDuration(duration) {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!match) return 'Unknown';

        const hours = (match[1] || '').replace('H', '');
        const minutes = (match[2] || '').replace('M', '');
        const seconds = (match[3] || '').replace('S', '');

        if (hours) {
            return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
        } else if (minutes) {
            return `${minutes}:${seconds.padStart(2, '0')}`;
        } else {
            return `0:${seconds.padStart(2, '0')}`;
        }
    }

    renderPlaylist() {
        const playlistContainer = document.getElementById('playlistItems');
        playlistContainer.innerHTML = '';

        if (this.searchResults.length === 0) {
            playlistContainer.innerHTML = '<div class="loading">No results found.</div>';
            return;
        }

        this.searchResults.forEach((video, index) => {
            const isBlocked = this.blockedVideos.includes(video.id);
            const item = document.createElement('div');
            item.className = `playlist-item ${isBlocked ? 'blocked' : ''} ${index === this.currentVideoIndex && !isBlocked ? 'active' : ''}`;

            item.innerHTML = `
                <img src="${video.thumbnail}" alt="${video.title}" class="thumbnail">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${video.title}</div>
                    <div style="font-size: 0.8rem; color: #a0a0c0;">${video.channel}</div>
                </div>
                <span class="duration">${video.duration}</span>
            `;

            if (!isBlocked) {
                item.addEventListener('click', () => {
                    this.currentVideoIndex = index;
                    if (this.player && this.player.loadVideoById) {
                        this.player.loadVideoById(video.id);
                        this.updatePlaylistUI();
                        this.updateNowPlaying();
                        this.player.playVideo();
                    }
                });
            }

            playlistContainer.appendChild(item);
        });
    }

    updatePlaylistUI() {
        const items = document.querySelectorAll('.playlist-item');
        items.forEach((item, index) => {
            const isBlocked = this.blockedVideos.includes(this.searchResults[index].id);
            if (index === this.currentVideoIndex && !isBlocked) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    updateNowPlaying() {
        if (this.searchResults.length > 0 && this.currentVideoIndex >= 0) {
            const currentVideo = this.searchResults[this.currentVideoIndex];
            document.getElementById('nowPlayingThumb').src = currentVideo.thumbnail;
            document.getElementById('nowPlayingTitle').textContent = currentVideo.title;
            document.getElementById('nowPlayingChannel').textContent = currentVideo.channel;
            document.getElementById('nowPlaying').style.display = 'flex';
        }
    }

    clearPlaylist() {
        this.searchResults = [];
        this.blockedVideos = [];
        this.currentVideoIndex = 0;
        document.getElementById('playlistItems').innerHTML = '<div class="loading">Search for music to populate the playlist</div>';
        document.getElementById('nowPlaying').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'none';
        
        if (this.player && this.player.stopVideo) {
            this.player.stopVideo();
        }
        this.stopProgressTracking();
        
        document.getElementById('currentTime').textContent = '0:00';
        document.getElementById('duration').textContent = '0:00';
        document.getElementById('progressBar').style.width = '0%';
        
        if (window.adBlocker) {
            window.adBlocker.log('Playlist cleared', 'system');
        }
    }
}

// Initialize the music player when the page loads
let musicPlayer;
document.addEventListener('DOMContentLoaded', function() {
    musicPlayer = new MusicPlayer();
});
