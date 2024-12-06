let score = JSON.parse(localStorage.getItem('score')) || {
  wins: 0,
  losses: 0,
  ties: 0
};

updateScoreElement();

let isAutoPlaying = false;
let intervalId;

function autoPlay() {
  if (!isAutoPlaying) {
    intervalId = setInterval(() => {
      const playMove = pickComputerMove();
      playGame(playMove);
    }, 3000);
    isAutoPlaying = true;
  } else {
    clearInterval(intervalId);
    isAutoPlaying = false;
  }
}

document.querySelector('.js-rock-button').addEventListener('click', () => {
  playGame('Rock');
});

document.querySelector('.js-paper-button').addEventListener('click', () => {
  playGame('Paper');
});

document.querySelector('.js-scissors-button').addEventListener('click', () => {
  playGame('Scissors');
});

document.body.addEventListener('keydown', (event) => {
  if (event.key === 'r') {
    playGame('Rock');
  } else if (event.key === 'p') {
    playGame('Paper');

  } else if (event.key === 's') {
    playGame('Scissors')
  }
});

updateScoreElement();

function playGame(playerMove) {
  const computerMove = pickComputerMove();

  let result = '';

  if (playerMove === 'Scissors') {
    if (computerMove === 'Rock') {
      result = 'Perdiste';
    } else if (computerMove === 'Paper') {
      result = 'Ganaste';
    } else if (computerMove === 'Scissors') {
      result = 'Empate';
    }

  } else if (playerMove === 'Paper') {
    if (computerMove === 'Rock') {
      result = 'Ganaste';
    } else if (computerMove === 'Paper') {
      result = 'Empate';
    } else if (computerMove === 'Scissors') {
      result = 'Perdiste';
    }

  } else if (playerMove === 'Rock') {
    if (computerMove === 'Rock') {
      result = 'Empate';
    } else if (computerMove === 'Paper') {
      result = 'Perdiste';
    } else if (computerMove === 'Scissors') {
      result = 'Ganaste';
    }
  }

  if (result === 'Ganaste') {
    score.wins += 1;
  } else if (result === 'Perdiste') {
    score.losses += 1;
  } else if (result === 'Empate') {
    score.ties += 1;
  }


  updateScoreElement();

  document.querySelector('.js-result').innerHTML = result;

  document.querySelector('.js-moves').innerHTML = `<span style="font-size: 15px; color: red;">Tu</span><img style="font-size: 5px; height: 55px; width: 55px;" src="${playerMove}-emoji.png" class="move-icon">
  <img style="font-size: 5px; height: 55px; width: 55px;" src="${computerMove}-emoji.png" class="move-icon"><span style="font-size: 15px; color: blue;">Computadora</span>`;
}

function updateScoreElement() {
  document.querySelector('.js-score').innerHTML = `Triunfos: ${score.wins} Perdidas: ${score.losses} Empates: ${score.ties} `;
}


function pickComputerMove() {
  const randomNumber = Math.random();

  let computerMove = '';

  if (randomNumber >= 0 && randomNumber < 1 / 3) {
    computerMove = 'Rock';
  } else if (randomNumber >= 1 / 3 && randomNumber < 2 / 3) {
    computerMove = 'Paper';
  } else if (randomNumber >= 2 / 3 && randomNumber < 1) {
    computerMove = 'Scissors';
  }

  return computerMove;
}
