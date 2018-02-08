
var Examples = [
  {
    question: 'Who grows?',
    answers: [
      {
        answer: 'fur',
        explanation: 'Your answer is wrong because Who question refers to the doer of the action, i.e., who was the one responsible to grow fur.'
      },
      {
        answer: 'invalid',
        explanation: 'This is answer is wrong because the sentence contains this information quite explicitly.'
      },
      {
        answer: 'animals',
        explanation: 'Your answer is right!',
        correct: true
      }
    ]
  },
  {
    question: 'What do animals grow?',
    answers: [
      {
        answer: 'fur',
        explanation: 'Your answer is right!',
        correct: true
      },
      {
        answer: 'invalid',
        explanation: 'Your answer is wrong because the sentence contains this information quite explicitly.'
      },
      {
        answer: 'animals',
        explanation: 'Your answer is wrong because animals are the doer of the action.'
      }
    ]
  }, 
  {
    question: 'Where is fur grown?',
    answers: [
      {
        answer: 'skin of animal',
        explanation: 'Your answer is wrong because Your answer text is not present in the sentence.',
      },
      {
        answer: 'invalid',
        explanation: 'Your answer is right! General tip for where question is, when possible include a preposition for location.',
        correct: true
      },
      {
        answer: 'keep warm',
        explanation: 'Your answer is wrong because where question can ONLY be answered with a physical location.'
      }
    ]
  },
    {
    question: 'Who keeps warm?',
    answers: [
      {
        answer: 'fur',
        explanation: 'Your answer is wrong because the answer to Who questions is a doer of the action.'
      },
      {
        answer: 'invalid',
        explanation: 'Your answer is wrong because the sentence contains this information.'
      },
      {
        answer: 'animals',
        explanation: 'Your answer is right!',
        correct: true
      }
    ]
  },
   {
    question: 'What do animals keeps warm?',
    answers: [
      {
        answer: 'fur',
        explanation: 'Your answer is wrong because it is possible actions can be intransitive.'
      },
      {
        answer: 'invalid',
        explanation: 'Your answer is right! Note that the questions can sound not grammatical, use your best judgement.',
        correct: true
      },
      {
        answer: 'skin of animal',
        explanation: 'Your answer is wrong because Your answer text is not present in the sentence.'
      }
    ]
  },
  {
    question: 'animals grow fur _____________ animals keep warm?',
    answers: [
      {
        answer: 'enables',
        explanation: 'Your answer is right!',
        correct: true
      },
      {
        answer: 'prevents',
        explanation: 'Your answer is wrong because growing fur enables animals to keep warm'
      },
      {
        answer: 'none',
        explanation: 'Your answer is wrong there is a relation that can be derived from the sentence.'
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
