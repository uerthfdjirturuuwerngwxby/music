// Add these methods to your MusicPlayer class

setupAdBlockControls() {
    // Add ad-block controls to the UI
    const controls = document.querySelector('.controls');
    
    const adBlockBtn = document.createElement('button');
    adBlockBtn.className = 'btn btn-sm';
    adBlockBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Block Ads';
    adBlockBtn.title = 'Test ad-blocking functionality';
    adBlockBtn.addEventListener('click', () => {
        if (window.testAdBlocking) {
            window.testAdBlocking();
        }
    });
    
    // Insert after the existing controls
    controls.appendChild(adBlockBtn);
}

// Call this in your init method
// this.setupAdBlockControls();
