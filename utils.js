function updateIcons(theme, audioEnabled = true) {
    const themeIcon = document.querySelector('.theme-icon');
    const backIcon = document.querySelector('.back-icon');
    const audioIcon = document.querySelector('.audio-icon');
    const infoIcon = document.querySelector('.info-icon');
    const shuffleIcon = document.querySelector('.shuffle-icon');
    const resetIcon = document.querySelector('.reset-icon');
    const donateIcon = document.querySelector('.donate-icon');
    const storeIcon = document.querySelector('.store-icon');
    const loadingIcon = document.querySelector('.loading-icon');

    if (themeIcon) themeIcon.src = theme === 'bright' ? 'theme-bright.svg' : 'theme-night.svg';
    if (backIcon) backIcon.src = theme === 'bright' ? 'back-bright.svg' : 'back-night.svg';
    if (audioIcon) audioIcon.src = theme === 'bright' ? (audioEnabled ? 'unmute-bright.svg' : 'mute-bright.svg') : (audioEnabled ? 'unmute-night.svg' : 'mute-night.svg');
    if (infoIcon) infoIcon.src = theme === 'bright' ? 'information-bright.svg' : 'information-night.svg';
    if (shuffleIcon) shuffleIcon.src = theme === 'bright' ? 'shuffle-bright.svg' : 'shuffle-night.svg';
    if (resetIcon) resetIcon.src = theme === 'bright' ? 'reset-bright.svg' : 'reset-night.svg';
    if (donateIcon) donateIcon.src = theme === 'bright' ? 'heart-bright.svg' : 'heart-night.svg';
    if (storeIcon) storeIcon.src = theme === 'bright' ? 'bag-bright.svg' : 'bag-night.svg';
    if (loadingIcon) loadingIcon.src = theme === 'bright' ? 'loading-bright.gif' : 'loading-night.gif';
}
