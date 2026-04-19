const startBtn = document.getElementById('startBtn');
    const stopBtn  = document.getElementById('stopBtn');
    const output   = document.getElementById('transcript');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      output.textContent = 'Speech Recognition not supported in this browser.';
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;       // keep listening until stopped
      recognition.interimResults = true;   // show live partial results
      recognition.lang = 'en-US';

      let finalTranscript = '';

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += text + ' ';
          } else {
            interim += text;
          }
        }
        output.innerHTML = finalTranscript + '<i style="color:#999">' + interim + '</i>';
      };

      recognition.onerror = (e) => {
        output.textContent = 'Error: ' + e.error;
      };

      startBtn.addEventListener('click', () => {
        finalTranscript = '';
        recognition.start();
        startBtn.disabled = true;
        stopBtn.disabled  = false;
        output.innerHTML  = '<em>Listening...</em>';
      });

      stopBtn.addEventListener('click', () => {
        recognition.stop();
        startBtn.disabled = false;
        stopBtn.disabled  = true;
      });
    }