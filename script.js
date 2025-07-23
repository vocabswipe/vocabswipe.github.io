* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: #000000;
  color: #ffffff;
  font-family: 'Arial', sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: hidden;
}

.card-deck {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  padding: 20px;
  width: 100%;
  max-width: 480px;
  transform-origin: center center;
  will-change: transform;
}

.loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.2rem;
  color: #00ff88;
  opacity: 1;
  transition: opacity 0.3s ease;
  display: none;
}

.mini-card {
  background-color: #2c2c2c;
  border: 3px solid #ffffff;
  border-radius: 5px;
  width: 140px;
  height: 222px;
  max-width: 95vw;
  max-height: calc(95vw * 1.59);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.7s ease, opacity 0.7s ease, width 0.7s ease, height 0.7s ease, border 0.7s ease;
  position: relative;
  z-index: 10;
  perspective: 1000px;
  touch-action: pan-y;
  user-select: none;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s ease;
  transform-style: preserve-3d;
}

.card-front, .card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-back {
  transform: rotateY(180deg);
}

.flip .card-inner {
  transform: rotateY(180deg);
}

.mini-card:hover {
  transform: scale(1.05);
}

.content {
  width: 100%;
  height: 100%;
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.sentences {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.mini-card-word {
  font-family: 'Arial', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  text-align: center;
  color: #ffffff;
  text-shadow: -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 1px 1px 0 #000000;
  white-space: nowrap;
  max-width: 90%;
}

.english {
  font-family: 'Arial', sans-serif;
  font-size: 0.7rem;
  font-weight: 400;
  text-align: left;
  color: #ffffff;
  text-shadow: -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 1px 1px 0 #000000;
  max-width: 90%;
}

.english .highlight {
  font-weight: 700;
  color: #ffffff;
  text-shadow: -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 1px 1px 0 #000000;
}

.thai {
  font-family: 'Noto Sans Thai', sans-serif;
  font-size: 0.65rem;
  font-weight: 400;
  text-align: right;
  color: #ffffff;
  text-shadow: -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 1px 1px 0 #000000;
  max-width: 90%;
}

.audio-error {
  font-family: 'Arial', sans-serif;
  font-size: 0.7rem;
  color: #ff4081;
  text-align: center;
  position: absolute;
  bottom: 5px;
  width: 100%;
  display: none;
}

.error-message {
  color: #ff4081;
  font-size: 1.2rem;
  text-align: center;
  padding: 20px;
  max-width: 90%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

@media (max-width: 600px) {
  .card-deck {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
    padding: 15px;
  }

  .mini-card {
    width: 120px;
    height: 191px;
    max-width: 95vw;
    max-height: calc(95vw * 1.59);
    border: 3px solid #ffffff;
  }

  .mini-card-word {
    font-size: 1rem;
    color: #ffffff;
    text-shadow: -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 1px 1px 0 #000000;
  }

  .english {
    font-size: 0.65rem;
    color: #ffffff;
    text-shadow: -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 1px 1px 0 #000000;
  }

  .english .highlight {
    color: #ffffff;
    text-shadow: -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 1px 1px 0 #000000;
  }

  .thai {
    font-size: 0.6rem;
    color: #ffffff;
    text-shadow: -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 1px 1px 0 #000000;
  }

  .audio-error {
    font-size: 0.6rem;
  }

  .loading-indicator {
    font-size: 1rem;
  }

  .error-message {
    font-size: 1rem;
  }
}
