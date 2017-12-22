function render() {
  var sentence = {{ sentence }};
  var $questions = $('.questions');

  $('<p>')
    .attr('class', 'question-header')
    .text(sentence.tokens.join(' '))
    .appendTo($questions);

  $('<h2>')
    .text('Actions')
    .appendTo($questions);

  askActionQuestions($questions, sentence).then(function(actions) {
    if (actions.length > 1) {
      $('<h2>')
        .text('Action Relations')
        .appendTo($questions);
    }

    return askActionRelationQuestions($questions, actions).then(function(actionRelations) {
      return Promise.resolve({
        actions: actions,
        actionRelations: actionRelations
      });
    });
  }).then(function(answers) {
    console.log(answers);
  }).catch(function(error) {
    console.error(error);
  });
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

function askActionQuestionsForVerb($container, sentence, verb) {
  var $questionContainer = $('<div>')
    .attr('id', verb.lemma)
    .appendTo($container);
  $('<h3>').text(verb.lemma)
    .appendTo($questionContainer);

  var who, what, where, when, whereFrom, whereTo, input, output;

  function askQuestion(text) {
    var $question = $('<p>').appendTo($questionContainer);
    $('<span>').text(text + '?').appendTo($question);
    var takenIndices = _.flatten([
      _.range(verb.span[0], verb.span[1]),
      who ? who.indices : [],
      what ? what.indices : []
    ]);
    return getSpan($question, sentence.tokens, takenIndices).then(function(answerIndices) {
      var $answer = $('<span>')
        .attr('class', 'answer')
        .appendTo($question);

      if (_.isEmpty(answerIndices)) {
        $answer.text('N/A')
        return Promise.resolve(null);
      }

      var answerPhrase = getTokens(sentence.tokens, answerIndices);
      var answerTokens = answerIndices.map(function(index) {
        return sentence.tokens[index];
      });
      $answer.text(answerPhrase);
      return Promise.resolve({
        indices: answerIndices,
        tokens: answerTokens,
        phrase: answerTokens.join(' ')
      });
    });
  }

  function complete() {
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
  }

  return askQuestion('Who ' + verb.present).then(function(selected) {
    who = selected;

    return askQuestion(
      who ?
      'What do ' + who.phrase + ' ' + verb.lemma :
      'What is ' + verb.past
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

    return askQuestion(question);
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

    return askQuestion(question);
  }).then(function(selected) {
    when = selected;

    return askYesNoQuestion(
      $questionContainer,
      'Is anything moved when ' + getActionPhrase(verb, who, what)
    ).then(function(yes) {
      if (!yes) return Promise.resolve();

      return askQuestion('• Where is it moved from').then(function(selected) {
        whereFrom = selected;
        return askQuestion('• Where is it moved to');
      }).then(function(selected) {
        whereTo = selected;
        return Promise.resolve();
      });
    });
  }).then(function() {
    return askYesNoQuestion(
      $questionContainer,
      'Is anything produced/created when ' + getActionPhrase(verb, who, what)
    ).then(function(yes) {
      if (!yes) return Promise.resolve();

      return askQuestion('• What is the input').then(function(selected) {
        input = selected;
        return askQuestion('• What is the output');
      }).then(function(selected) {
        output = selected;
        return Promise.resolve();
      });
    });
  }).then(function() {
    return complete();
  }).catch(function(error) {
    if (error) {
      return Promise.reject(error);
    }

    return complete();
  });
}

function askYesNoQuestion($parent, text) {
  return new Promise(function(resolve, reject) {
    var $container = $('<p>')
      .attr('class', 'yes-no-buttons')
      .appendTo($parent);

    $('<span>').text(text + '?').appendTo($container);

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
        .appendTo($container);
    }
  });
}

function askActionRelationQuestion($parent, action1, action2) {
  return new Promise(function(resolve, reject) {
    var $container = $('<div>')
      .appendTo($parent);

    $('<span>')
      .text(action1)
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
      .text('Submit')
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
        $(this).remove();

        resolve(relation);
      })
      .appendTo($container);
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
      .text('Submit')
      .attr('class', 'btn btn-success')
      .click(function() {
        if (selected.length === 0) {
          return alert('Please select at least one word. If the question is invalid, press "Invalid".');
        }

        if (!isContiguous(selected)) {
          return alert('Please select a contiguous span of words.');
        }

        $form.remove();
        resolve(selected);
      })
      .appendTo($submitButtons);

    $('<button>')
      .text('Invalid')
      .attr('class', 'btn btn-danger')
      .click(function() {
        $form.remove();
        resolve(null);
      })
      .appendTo($submitButtons);
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

function getTokens(tokens, indices) {
  if (_.isEmpty(indices)) {
    return null;
  }

  return indices.map(i => tokens[i]).join(' ');
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

// Define some default input.
var DEFAULT_INPUT = [
'{{image_id}}'
];


// Descriptions of images, parallel to input.
var descriptions = [];

// Some variables to track state of the HIT.
var idx = 0;
var enabled = false;

function main() {
  // If this is a HIT on AMT, then replace the default input with the real input.
  input = simpleamt.getInput(DEFAULT_INPUT);

  // Enable the UI if the HIT is not in preview mode.
  if (!simpleamt.isPreview()) {
    enable_hit();
  }

  // Set up the descriptions.
  // _.each(input, function() { descriptions.push(''); });

  render();
}

// Enable the UI.
function enable_hit() {
  enabled = true;

  // Enable components
  <!--$('#next-btn').click(function() { set_idx(idx + 1) });-->
  <!--$('#prev-btn').click(function() { set_idx(idx - 1) });-->
  $('#setting').prop('disabled', false);
  $('#submit-btn').prop('disabled', false);

  // Set up submit handler.
  simpleamt.setupSubmit();
  $('#submit-btn').click(function() {
    if (descriptions.length < 1) {
      alert('Make sure to mark the actions, or select -There are no actions- if there are none');
      return false;
    }
    var output = {'image_url': input[0], 'description': descriptions}
    simpleamt.setOutput(output);
  });
}

main();
