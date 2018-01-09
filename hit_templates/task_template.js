var UNDO_TOOLTIP = 'Re-enter answers for this verb.';
var ACTION_SUBMIT_TOOLTIP = 'Submit answers for this action.';
var SUBMIT_TOOLTIP = 'Answer all questions before submitting the HIT.';
var NEXT_TOOLTIP = 'Submit answer and go to next question.';
var INVALID_TOOLTIP = 'Question is invalid.';
var NEXT_RELATION_TOOLTIP = 'Submit answer and go to next question.';

function main() {
  var sentence = {{ sentence }};
  var $questions = $('.questions');

  $('<h2>')
    .text('Sentence')
    .appendTo($questions);

  $('<p>')
    .attr('class', 'question-header')
    .text(sentence.tokens.join(' '))
    .appendTo($questions);

  $('<h2>')
    .text('Actions')
    .appendTo($questions);

  var $questionsContainer = $('<div>')
    .appendTo($questions);

  var submitURL = getURLParam('turkSubmitTo') + '/mturk/externalSubmit';

  $('<hr>').appendTo($questions);

  var $submitForm = $('<form>')
    .attr('method', 'post')
    .attr('action', submitURL)
    .appendTo($questions);

  $('<input>')
    .attr('name', 'assignmentId')
    .attr('type', 'hidden')
    .val(getURLParam('assignmentId'))
    .appendTo($submitForm);

  var $submitAnswers = $('<input>')
    .attr('name', 'answers')
    .attr('type', 'hidden')
    .appendTo($submitForm);

  var $submitButtonContainer = $('<div>')
    .attr('class', 'submit-button-container')
    .attr('data-toggle', 'tooltip')
    .attr('title', SUBMIT_TOOLTIP)
    .appendTo($submitForm)
    .tooltip();

  var $submitButton = $('<input>')
    .attr('type', 'submit')
    .attr('class', 'btn btn-lg btn-success submit-button')
    .attr('value', 'Submit HIT')
    .prop('disabled', true)
    .appendTo($submitButtonContainer);

  askActionQuestions($questionsContainer, sentence).then(function(actions) {
    var validIndices = [];
    var validActions = actions.filter(function(action, index) {
      if (!(action.questions.who || action.questions.what)) return false;
      validIndices.push(index);
      return true;
    });

    if (validActions.length > 1) {
      $('<h2>')
        .text('Action Relations')
        .appendTo($questionsContainer);
    }

    return askActionRelationQuestions($questionsContainer, validActions).then(function(actionRelations) {
      actionRelations.forEach(function(relation) {
        relation.source = validIndices[relation.source];
        relation.target = validIndices[relation.target];
      });

      return Promise.resolve({
        sentid: sentence.id,
        senttokens: sentence.tokens,
        actions: actions,
        actionRelations: actionRelations
      });
    });
  }).then(function(answers) {
    $submitAnswers.val(JSON.stringify(answers))
    $submitButton.prop('disabled', false);
  }).catch(function(error) {
    console.error(error);
  });
}

function getURLParam(name) {
  var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
  return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : null;
}

function askActionQuestions($container, sentence) {
  var verbIndices = _.flatten(sentence.verbs.map(function(verb) {
    return _.range(verb.span[0], verb.span[1]);
  }));

  return Promise.all(sentence.verbs.map(function(verb) {
    return askActionQuestionsForVerb($container, sentence, verb);
  }));
}

function askActionRelationQuestions($container, verbAnswers) {
  var actions = verbAnswers.map(function(answer) {
    return getActionPhrase(
      answer.verb,
      answer.questions.who,
      answer.questions.what
    );
  });

  return Promise.all(pairs(actions.length).map(function(indices) {
    return askActionRelationQuestion(
      $container,
      actions[indices[0]],
      actions[indices[1]]
    ).then(function(relation) {
      return Promise.resolve(canonicalizeRelation(indices, relation));
    });
  }));
}

function askActionQuestionsForVerb($parent, sentence, verb) {
  var $container = $('<div>')
    .attr('id', verb.lemma)
    .appendTo($parent);
  var $verb = $('<h3>')
    .text(verb.lemma)
    .appendTo($container);
  var $undoContainer = $('<span>')
    .appendTo($verb);
  var $questionsContainer = $('<div>')
    .appendTo($container);

  return askActionQuestionsForVerbWithUndo($questionsContainer, $undoContainer, sentence, verb);
}

function askActionQuestionsForVerbWithUndo($questionsContainer, $undoContainer, sentence, verb) {
  return Promise.race([
    undoPromise($undoContainer),
    actionQuestionsPromise($questionsContainer, sentence, verb)
  ]).then(function(response) {
    if (!response) {
      $questionsContainer.empty();
      $undoContainer.empty();
      return askActionQuestionsForVerbWithUndo($questionsContainer, $undoContainer, sentence, verb);
    }

    $undoContainer.empty();
    return Promise.resolve(response);
  });
}

function undoPromise($parent) {
  return new Promise(function(resolve, reject) {
    $('<button>')
      .text('Undo')
      .attr('class', 'btn btn-warning undo-button')
      .attr('data-toggle', 'tooltip')
      .attr('title', UNDO_TOOLTIP)
      .click(function() {
        resolve();
      })
      .appendTo($parent)
      .tooltip();
  });
}

function actionQuestionsPromise($container, sentence, verb) {
  var who, what, where, when, whereFrom, whereTo, input, output;

  return askSpanQuestion(
    $container,
    'Who ' + verb.present,
    sentence.tokens,
    [sentence.verbs]
  ).then(function(selected) {
    who = selected;

    return askSpanQuestion(
      $container,
      who ?
        'What do ' + who.phrase + ' ' + verb.lemma :
        'What is ' + verb.past,
      sentence.tokens,
      [sentence.verbs, who]
    );
  }).then(function(selected) {
    what = selected;

    if (!who && !what) {
      return Promise.reject();
    }

    var question;
    if (who && what) {
      question = ['Where do', who.phrase, verb.lemma, what.phrase].join(' ');
    } else if (who) {
      question = ['Where do', who.phrase, verb.present].join(' ');
    } else if (what) {
      question = ['Where is', what.phrase, verb.past].join(' ');
    }

    return askSpanQuestion(
      $container,
      question,
      sentence.tokens,
      [sentence.verbs, who, what]
    );
  }).then(function(selected) {
    where = selected;

    var question;
    if (who && what) {
      question = ['When do', who.phrase, verb.lemma, what.phrase].join(' ');
    } else if (who) {
      question = ['When do', who.phrase, verb.present].join(' ');
    } else if (what) {
      question = ['When is', what.phrase, verb.past].join(' ');
    }

    return askSpanQuestion(
      $container,
      question,
      sentence.tokens,
      [sentence.verbs, who, what, where]
    );
  }).then(function(selected) {
    when = selected;

    return askYesNoQuestion(
      $container,
      'Is anything moved when ' + getActionPhrase(verb, who, what)
    ).then(function(yes) {
      if (!yes) return Promise.resolve();

      return askSpanQuestion(
        $container,
        '- Where is it moved from',
        sentence.tokens,
        sentence.verbs
      ).then(function(selected) {
        whereFrom = selected;

        return askSpanQuestion(
          $container,
          '- Where is it moved to',
          sentence.tokens,
          [sentence.verbs, whereFrom]
        );
      }).then(function(selected) {
        whereTo = selected;
        return Promise.resolve();
      });
    });
  }).then(function() {
    return askYesNoQuestion(
      $container,
      'Is anything produced/created when ' + getActionPhrase(verb, who, what)
    ).then(function(yes) {
      if (!yes) return Promise.resolve();

      return askSpanQuestion(
        $container,
        '- What is the input',
        sentence.tokens,
        sentence.verbs
      ).then(function(selected) {
        input = selected;

        return askSpanQuestion(
          $container,
          '- What is the output',
          sentence.tokens,
          [sentence.verbs, input]
        );
      }).then(function(selected) {
        output = selected;
        return Promise.resolve();
      });
    });
  }).catch(function(error) {
    if (error) {
      return Promise.reject(error);
    }

    return Promise.resolve();
  }).then(function() {
    return new Promise(function(resolve, reject) {
      $('<button>')
        .text('Submit Action')
        .attr('class', 'btn btn-success')
        .attr('data-toggle', 'tooltip')
        .attr('title', ACTION_SUBMIT_TOOLTIP)
        .click(function() {
          $(this).tooltip('hide');
          $(this).remove();
          resolve();
        })
        .appendTo($container)
        .tooltip();
    });
  }).then(function() {
    return Promise.resolve({
      verb: verb,
      questions: {
        who: who,
        what: what,
        where: where,
        when: when,
        whereFrom: whereFrom,
        whereTo: whereTo,
        input: input,
        output: output
      }
    });
  });
}

function getTakenSpans(verbs, who, what) {
  var taken = verbs.map(function(verb) {
    return verb.span;
  });
}

function askYesNoQuestion($parent, text) {
  return new Promise(function(resolve, reject) {
    var $container = $('<div>')
      .attr('class', 'yes-no-buttons')
      .appendTo($parent);

    var $question = $('<p>').appendTo($container);
    $('<span>').text(text + '?').appendTo($question);

    $('<button>')
      .text('Yes')
      .attr('class', 'btn btn-success')
      .click(function() {
        finish('Yes');
        resolve(true);
      })
      .appendTo($container);

    $('<button>')
      .text('No')
      .attr('class', 'btn btn-danger')
      .click(function() {
        finish('No');
        resolve(false);
      })
      .appendTo($container);

    function finish(answer) {
      $container.find('button').remove();
      $('<span>')
        .attr('class', 'answer')
        .text(answer)
        .appendTo($question);
    }
  });
}

function askActionRelationQuestion($parent, action1, action2) {
  return new Promise(function(resolve, reject) {
    var $container = $('<div>')
      .appendTo($parent);

    $('<span>')
      .text('When ' + action1 + ', it')
      .appendTo($container);

    var relation;
    var $relations = $('<span>').appendTo($container);
    radioButtons(
      'relation',
      EVENT_RELATIONS,
      function(selected) {
        relation = selected;
      })
      .attr('class', 'relation-options')
      .appendTo($relations);

    $('<span>')
      .text(action2)
      .appendTo($container);

    $('<button>')
      .text('Next')
      .attr('class', 'btn btn-success submit-relations')
      .click(function() {
        if (!relation) {
          return alert('Please select a relation between the two actions.');
        }

        var relationText = _.find(EVENT_RELATIONS, function(r) {
          return r.value === relation;
        }).text;

        $relations.empty();
        $('<span>')
          .attr('class', 'answer')
          .text(relationText)
          .appendTo($relations);
        $(this).tooltip('hide');
        $(this).remove();

        resolve(relation);
      })
      .attr('data-toggle', 'tooltip')
      .attr('title', NEXT_RELATION_TOOLTIP)
      .appendTo($container)
      .tooltip();
  });
}

var ENABLES = 'enable',
    ENABLED_BY = 'enabled_by',
    PREVENTS = 'prevent',
    PREVENTED_BY = 'prevented_by',
    NONE = 'none';
var EVENT_RELATIONS = [
  {
    value: ENABLES,
    text: 'enables'
  },
  {
    value: ENABLED_BY,
    text: 'is enabled by'
  },
  {
    value: PREVENTS,
    text: 'prevents'
  },
  {
    value: PREVENTED_BY,
    text: 'is prevented by'
  },
  {
    value: NONE,
    text: 'does not affect'
  }
];

function askSpanQuestion($container, text, tokens, takenSpans) {
  var $question = $('<p>').appendTo($container);
  $('<span>').text(text + '?').appendTo($question);

  var takenIndices = _.flatten(
    _.flatten(takenSpans)
      .filter(function(span) {
        return span !== null;
      })
      .map(function(span) {
        return _.range(span.span[0], span.span[1]);
      })
  );

  return getSpan($question, tokens, takenIndices).then(function(answerSpan) {
    var $answer = $('<span>')
      .attr('class', 'answer')
      .appendTo($question);

    if (_.isEmpty(answerSpan)) {
      $answer.text('N/A')
      return Promise.resolve(null);
    }

    var answerTokens = tokens.slice(answerSpan[0], answerSpan[1]);
    var answerPhrase = answerTokens.join(' ');

    $answer.text(answerPhrase);

    return Promise.resolve({
      span: answerSpan,
      tokens: answerTokens,
      phrase: answerPhrase
    });
  });
}

function getSpan($container, tokens, takenIndices) {
  return new Promise(function(resolve, reject) {
    var $form = $('<div>')
      .attr('class', 'token-selector')
      .appendTo($container);
    var selected = [];

    tokens.forEach(function(token, index) {
      var $button = $('<input>')
        .attr('type', 'button')
        .attr('class', 'btn token-button')
        .val(token)
        .click(function() {
          $(this).toggleClass('btn-primary');

          if (!_.includes(selected, index)) {
            selected.splice(_.sortedIndex(selected, index), 0, index);
          } else {
            selected.splice(selected.indexOf(index), 1);
          }
        })
        .appendTo($form);

      if (_.includes(takenIndices, index)) {
        $button
          .prop('disabled', true)
          .addClass('disabled');
      }
    });

    $submitButtons = $('<div>')
      .attr('class', 'submit-buttons')
      .appendTo($form);

    $('<button>')
      .text('Next')
      .attr('class', 'btn btn-success')
      .click(function() {
        if (selected.length === 0) {
          return alert('Please select at least one word. If the question is invalid, press "Invalid".');
        }

        if (!isContiguous(selected)) {
          return alert('Please select a contiguous span of words.');
        }

        $form.remove();
        resolve([selected[0], selected[selected.length - 1] + 1]);
      })
      .attr('data-toggle', 'tooltip')
      .attr('title', NEXT_TOOLTIP)
      .appendTo($submitButtons)
      .tooltip();

    $('<button>')
      .text('Invalid')
      .attr('class', 'btn btn-danger')
      .click(function() {
        $form.remove();
        resolve(null);
      })
      .attr('data-toggle', 'tooltip')
      .attr('title', INVALID_TOOLTIP)
      .appendTo($submitButtons)
      .tooltip();
  });
}

function getActionPhrase(verb, who, what) {
  if (who && what) {
    return [who.phrase, verb.lemma, what.phrase].join(' ');
  } else if (who) {
    return [who.phrase, verb.lemma].join(' ');
  } else if (what) {
    return [what.phrase, 'is', verb.past].join(' ');
  }
}

function joinSpans(spans) {
  return spans.map(function(span) {
    return span.phrase;
  }).join(' ');
}

function isContiguous(indices) {
  if (indices.length <= 1) {
    return true;
  }

  for (var i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) {
      return false;
    }
  }

  return true;
}

function radioButtons(name, options, onChange) {
  var $form = $('<form>');
  var $fieldSet = $('<fieldset>').appendTo($form);

  options.forEach(function(option) {
    radioButton(name, option.value, option.text)
      .appendTo($fieldSet)
      .find('input')
      .change(function() {
        if ($(this).prop('checked')) {
          onChange(option.value);
        }
      });
  });

  return $form;
}

function radioButton(name, value, text) {
  var $label = $('<label>')
  $('<input>')
    .attr('type', 'radio')
    .attr('name', name)
    .attr('value', value)
    .appendTo($label);
  $('<span>')
    .text(text)
    .appendTo($label);
  return $label;
}

function pairs(n) {
  var pairs = [];
  for (var i = 0; i < n - 1; i++) {
    for (var j = i + 1; j < n; j++) {
      pairs.push([i, j]);
    }
  }
  return pairs;
}

// 0 ENABLED_BY 1 -> 1 ENABLES 0
function canonicalizeRelation(indices, relation) {
  var forwards = !(relation === ENABLED_BY || relation === PREVENTED_BY);
  var source = forwards ? indices[0] : indices[1];
  var target = forwards ? indices[1] : indices[0];

  var relationType = relation;
  if (relation === ENABLED_BY) {
    relationType = ENABLES;
  } else if (relation === PREVENTED_BY) {
    relationType = PREVENTS;
  }

  return {
    source: source,
    target: target,
    relation: relationType
  };
}

main();
