
var Examples = [
  {
    question: 'Who grows?',
    answers: [
      {
        answer: 'fur',
        explanation: 'Incorrect. Who question always refers to the doer of the action, i.e., who was the one responsible to grow fur.'
      },
      {
        answer: 'invalid',
        explanation: 'Incorrect. The answer is explicitly present in the sentence.'
      },
      {
        answer: 'animals',
        explanation: 'Correct!',
        correct: true
      }
    ]
  },
  {
    question: 'What do animals grow?',
    answers: [
      {
        answer: 'fur',
        explanation: 'Correct!',
        correct: true
      },
      {
        answer: 'invalid',
        explanation: 'Incorrect. The answer is explicitly present in the sentence.'
      }
    ]
  },
  {
    question: 'Where is fur grown?',
    answers: [
      {
        answer: 'skin of animal',
        explanation: 'Incorrect. This answer text is not present in the sentence.',
      },
      {
        answer: 'invalid',
        explanation: 'Correct! General tip for where or when question: when possible include a preposition.',
        correct: true
      },
      {
        answer: 'keep warm',
        explanation: 'Incorrect. Where question can ONLY be answered with a physical location.'
      }
    ]
  },
    {
    question: 'Who keeps warm?',
    answers: [
      {
        answer: 'fur',
        explanation: 'Incorrect. Who question always refers to the doer of the action.'
      },
      {
        answer: 'invalid',
        explanation: 'Incorrect. The answer is explicitly present in the sentence.'
      },
      {
        answer: 'animals',
        explanation: 'Correct!',
        correct: true
      }
    ]
  },
   {
    question: 'What do animals keep warm?',
    answers: [
      {
        answer: 'fur',
        explanation: 'Incorrect. When actions are intransitive verbs, there may be no valid answer.'
      },
      {
        answer: 'invalid',
        explanation: 'Correct! Note: questions can sound ungrammatical, use your best judgement.',
        correct: true
      },
      {
        answer: 'skin of animal',
        explanation: 'Incorrect. This answer text is not present in the sentence.',
      }
    ]
  },
  {
    question: 'animals grow fur _____________ animals keep warm?',
    answers: [
      {
        answer: 'enables',
        explanation: 'Correct!',
        correct: true
      },
      {
        answer: 'prevents',
        explanation: 'Incorrect. Growing fur enables animals to keep warm'
      },
      {
        answer: 'none',
        explanation: 'Incorrect. A relation can be derived from the sentence.'
      }
    ]
  }
];

$(function() {
  var $interactiveExample = $('#interactive-example');

  Examples.forEach(function(example, exampleIndex) {
    var $example = $('<div>')
      .appendTo($interactiveExample);

    var $question = $('<div>')
      .attr('class', 'interactive-example-question')
      .appendTo($example);

    $('<span>')
      .text(example.question)
      .appendTo($question);

    example.answers.forEach(function(answer) {
      console.log(answer);
      var $answerLabel = $('<span>')
        .attr('class', 'interactive-example-answer-label')
        .text(answer.answer)
        .appendTo($question);

      var $answerButton = $('<input>')
        .attr('name', exampleIndex)
        .attr('type', 'radio')
        .appendTo($question);

      $answerButton.click(function() {
        if (answer.correct) {
          $explanation
            .removeClass('alert-danger')
            .addClass('alert-success')
            .text(answer.explanation)
            .show();
        } else {
          $explanation
            .removeClass('alert-success')
            .addClass('alert-danger')
            .text(answer.explanation)
            .show();
        }
      });
    });
    
    var $explanation = $('<div>')
      .attr('class', 'alert')
      .appendTo($example)
      .hide();
  });
});
