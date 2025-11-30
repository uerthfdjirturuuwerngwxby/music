// YouTube Music Player with Enhanced Ad-Blocking
const API_KEY = 'AIzaSyAMGAR62RNI3Wu9YlKv43aq2-trVi1ZAM0';
let player;
let currentVideoIndex = 0;
let searchResults = [];
let blockedVideos = [];
let isPlaying = false;
let progressInterval;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
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
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerReady(event) {
    console.log("Player is ready with ad-blocking");
    document.getElementById('progressContainer').addEventListener('click', seekToPosition);
    
    // Apply additional ad-blocking to player
    if (window.adBlocker) {
        window.adBlocker.log('YouTube player initialized with ad-blocking');
    }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        playNextVideo();
    }

    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i> Pause';
        startProgressTracking();
        
        // Log successful playback
        if (window.adBlocker && searchResults[currentVideoIndex]) {
            window.adBlocker.log(`Now playing: ${searchResults[currentVideoIndex].title}`);
        }
    } else {
        isPlaying = false;
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i> Play';
        stopProgressTracking();
    }

    if (event.data === YT.PlayerState.PLAYING) {
        document.getElementById('errorMessage').style.display = 'none';
    }
}

function onPlayerError(event) {
    console.error('Player error:', event.data);
    document.getElementById('errorText').textContent = getErrorMessage(event.data);
    document.getElementById('errorMessage').style.display = 'block';

    if (searchResults[currentVideoIndex]) {
        blockedVideos.push(searchResults[currentVideoIndex].id);
        updatePlaylistUI();
        
        if (window.adBlocker) {
            window.adBlocker.log(`Video blocked: ${searchResults[currentVideoIndex].title}`, 'error');
        }
    }
}

function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 2: return "Invalid parameter values.";
        case 5: return "Content cannot be played in HTML5 player.";
        case 100: return "Video not found.";
        case 101:
        case 150: return "Video cannot be played on this website.";
        default: return "Unknown error occurred.";
    }
}

// Control functions
document.getElementById('playPauseBtn').addEventListener('click', function() {
    if (player && player.getPlayerState) {
        if (player.getPlayerState() === YT.PlayerState.PLAYING) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    }
});

document.getElementById('prevBtn').addEventListener('click', playPrevVideo);
document.getElementById('nextBtn').addEventListener('click', playNextVideo);

document.getElementById('skipBackwardBtn').addEventListener('click', function() {
    if (player && player.getCurrentTime) {
        const currentTime = player.getCurrentTime();
        player.seekTo(currentTime - 10, true);
    }
});

document.getElementById('skipForwardBtn').addEventListener('click', function() {
    if (player && player.getCurrentTime) {
        const currentTime = player.getCurrentTime();
        player.seekTo(currentTime + 10, true);
    }
});

function playPrevVideo() {
    if (searchResults.length > 0) {
        let prevIndex = (currentVideoIndex - 1 + searchResults.length) % searchResults.length;
        let attempts = 0;

        while (attempts < searchResults.length && blockedVideos.includes(searchResults[prevIndex].id)) {
            prevIndex = (prevIndex - 1 + searchResults.length) % searchResults.length;
            attempts++;
        }

        if (attempts < searchResults.length) {
            currentVideoIndex = prevIndex;
            player.loadVideoById(searchResults[currentVideoIndex].id);
            updatePlaylistUI();
            updateNowPlaying();
        }
    }
}

function playNextVideo() {
    if (searchResults.length > 0) {
        let nextIndex = (currentVideoIndex + 1) % searchResults.length;
        let attempts = 0;

        while (attempts < searchResults.length && blockedVideos.includes(searchResults[nextIndex].id)) {
            nextIndex = (nextIndex + 1) % searchResults.length;
            attempts++;
        }

        if (attempts < searchResults.length) {
            currentVideoIndex = nextIndex;
            player.loadVideoById(searchResults[currentVideoIndex].id);
            updatePlaylistUI();
            updateNowPlaying();
        }
    }
}

function startProgressTracking() {
    stopProgressTracking();
    progressInterval = setInterval(updateProgress, 1000);
}

function stopProgressTracking() {
    if (progressInterval) {
        clearInterval(progressInterval);
    }
}

function updateProgress() {
    if (player && player.getCurrentTime && player.getDuration) {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();

        document.getElementById('currentTime').textContent = formatTime(currentTime);
        document.getElementById('duration').textContent = formatTime(duration);

        const progress = (currentTime / duration) * 100;
        document.getElementById('progressBar').style.width = `${progress}%`;
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function seekToPosition(e) {
    if (player && player.getDuration) {
        const progressContainer = document.getElementById('progressContainer');
        const clickPosition = e.offsetX / progressContainer.offsetWidth;
        const duration = player.getDuration();
        const seekTime = duration * clickPosition;
        player.seekTo(seekTime, true);
    }
}

// Search functionality
document.getElementById('searchBtn').addEventListener('click', performSearch);
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') performSearch();
});

document.getElementById('clearPlaylist').addEventListener('click', function() {
    searchResults = [];
    blockedVideos = [];
    currentVideoIndex = 0;
    document.getElementById('playlistItems').innerHTML = '<div class="loading">Search for music to populate the playlist</div>';
    document.getElementById('nowPlaying').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
    
    if (player && player.stopVideo) player.stopVideo();
    stopProgressTracking();
    
    document.getElementById('currentTime').textContent = '0:00';
    document.getElementById('duration').textContent = '0:00';
    document.getElementById('progressBar').style.width = '0%';
    
    if (window.adBlocker) {
        window.adBlocker.log('Playlist cleared', 'system');
    }
});

async function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    document.getElementById('playlistItems').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching YouTube...</div>';
    document.getElementById('errorMessage').style.display = 'none';

    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(query + " music")}&type=video&key=${API_KEY}`);
        const data = await response.json();

        if (data.error) throw new Error(data.error.message);

        if (data.items.length === 0) {
            document.getElementById('playlistItems').innerHTML = '<div class="error">No results found. Try a different search.</div>';
            return;
        }

        const videoIds = data.items.map(item => item.id.videoId).join(',');
        const detailsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${API_KEY}`);
        const detailsData = await detailsResponse.json();

        searchResults = data.items.map(item => {
            const videoDetails = detailsData.items.find(detail => detail.id === item.id.videoId);
            return {
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.medium.url,
                channel: item.snippet.channelTitle,
                duration: formatDuration(videoDetails ? videoDetails.contentDetails.duration : 'PT0M0S')
            };
        });

        blockedVideos = [];
        renderPlaylist();

        if (searchResults.length > 0) {
            currentVideoIndex = 0;
            if (player && player.loadVideoById) {
                player.loadVideoById(searchResults[0].id);
                updatePlaylistUI();
                updateNowPlaying();
                
                if (window.adBlocker) {
                    window.adBlocker.log(`Loaded playlist: ${searchResults.length} songs`);
                }
            }
        }
    } catch (error) {
        console.error('Error searching YouTube:', error);
        document.getElementById('playlistItems').innerHTML = `<div class="error">Error: ${error.message}</div>`;
        
        if (window.adBlocker) {
            window.adBlocker.log(`Search error: ${error.message}`, 'error');
        }
    }
}

function formatDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 'Unknown';

    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');

    if (hours) return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
    if (minutes) return `${minutes}:${seconds.padStart(2, '0')}`;
    return `0:${seconds.padStart(2, '0')}`;
}

function renderPlaylist() {
    const playlistContainer = document.getElementById('playlistItems');
    playlistContainer.innerHTML = '';

    if (searchResults.length === 0) {
        playlistContainer.innerHTML = '<div class="loading">No results found.</div>';
        return;
    }

    searchResults.forEach((video, index) => {
        const isBlocked = blockedVideos.includes(video.id);
        const item = document.createElement('div');
        item.className = `playlist-item ${isBlocked ? 'blocked' : ''} ${index === currentVideoIndex && !isBlocked ? 'active' : ''}`;

        item.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}" class="thumbnail">
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${video.title}</div>
                <div style="font-size: 0.8rem; color: #a0a0c0;">${video.channel}</div>
            </div>
            <span class="duration">${video.duration}</span>
        `;

        if (!isBlocked) {
            item.addEventListener('click', function() {
                currentVideoIndex = index;
                if (player && player.loadVideoById) {
                    player.loadVideoById(video.id);
                    updatePlaylistUI();
                    updateNowPlaying();
                }
            });
        }

        playlistContainer.appendChild(item);
    });
}

function updatePlaylistUI() {
    const items = document.querySelectorAll('.playlist-item');
    items.forEach((item, index) => {
        const isBlocked = blockedVideos.includes(searchResults[index].id);
        if (index === currentVideoIndex && !isBlocked) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function updateNowPlaying() {
    if (searchResults.length > 0 && currentVideoIndex >= 0) {
        const currentVideo = searchResults[currentVideoIndex];
        document.getElementById('nowPlayingThumb').src = currentVideo.thumbnail;
        document.getElementById('nowPlayingTitle').textContent = currentVideo.title;
        document.getElementById('nowPlayingChannel').textContent = currentVideo.channel;
        document.getElementById('nowPlaying').style.display = 'flex';
    }
}

// Auto-search on load
window.addEventListener('load', function() {
    performSearch();
});