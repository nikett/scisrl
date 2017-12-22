function render() {
  var tokens = {{formatted_description | safe}};
  var verbSpans = {{verbids}};
  var $questions = $('.questions');

  $('<p>')
    .attr('class', 'question-header')
    .text(tokens.join(' '))
    .appendTo($questions);

  askActionQuestions($questions, tokens, verbSpans).then(function(actions) {
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

function askActionQuestions($container, tokens, verbSpans) {
  var verbIndices = _.flatten(verbSpans.map(function(span) {
    return _.range(span[0], span[1]);
  }));

  return Promise.all(verbSpans.map(function(verbSpan) {
    return askActionQuestionsForVerb($container, tokens, verbIndices, verbSpan);
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

function askActionQuestionsForVerb($container, tokens, verbIndices, verbSpan) {
  var verb = {
    phrase: tokens.slice(verbSpan[0], verbSpan[1]).join(' '),
    indices: _.range(verbSpan[0], verbSpan[1])
  };

  var $questionContainer = $('<div>')
    .attr('id', verb.phrase)
    .appendTo($container);
  $('<h3>').text(verb.phrase)
    .appendTo($questionContainer);

  var who, what, where, when, whereFrom, whereTo, input, output;

  function askQuestion(text) {
    var $question = $('<div>').appendTo($questionContainer);
    $('<p>').text(text + '?').appendTo($question);
    var takenIndices = _.flatten([
      verbIndices,
      who ? who.indices : [],
      what ? what.indices : []
    ]);
    return getSpan($question, tokens, takenIndices).then(function(selectedIndices) {
      if (_.isEmpty(selectedIndices)) {
        return Promise.resolve(null);
      }

      return Promise.resolve({
        phrase: getTokens(tokens, selectedIndices), 
        indices: selectedIndices
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

  return askQuestion('Who ' + getActionPhrase(verb)).then(function(selected) {
    who = selected;
    return askQuestion('What do ' + getActionPhrase(verb, who));
  }).then(function(selected) {
    what = selected;

    if (!who && !what) {
      return Promise.reject();
    }

    return askQuestion('Where do ' + getActionPhrase(verb, who, what))
  }).then(function(selected) {
    where = selected;
    return askQuestion('When do ' + getActionPhrase(verb, who, what));
  }).then(function(selected) {
    when = selected;

    return askYesNoQuestion(
      $questionContainer,
      'Is anything moved when ' + getActionPhrase(verb, who, what) + '?'
    ).then(function(yes) {
      if (!yes) return Promise.resolve();

      return askQuestion('Where is it moved from ').then(function(selected) {
        whereFrom = selected;
        return askQuestion('Where is it moved to ');
      }).then(function(selected) {
        whereTo = selected;
        return Promise.resolve();
      });
    });
  }).then(function() {
    return askYesNoQuestion(
      $questionContainer,
      'Is anything produced/created when ' + getActionPhrase(verb, who, what) + '?'
    ).then(function(yes) {
      if (!yes) return Promise.resolve();

      return askQuestion('What is the input ').then(function(selected) {
        input = selected;
        return askQuestion('What is the output ');
      }).then(function(selected) {
        output = selected;
        return Promise.resolve();
      });
    });
  }).catch(function(error) {
    if (error) {
      return Promise.reject(error);
    }

    return complete();
  });
}

function askYesNoQuestion($parent, text) {
  return new Promise(function(resolve, reject) {
    var $container = $('<div>').appendTo($parent);

    $('<span>').text(text).appendTo($container);

    $('<button>').text('Yes').appendTo($container).click(function() {
      disable();
      resolve(true);
    });

    $('<button>').text('No').appendTo($container).click(function() {
      disable();
      resolve(false);
    });

    function disable() {
      $container.find('button').prop('disabled', true);
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
    var $relations = radioButtons('relation', EVENT_RELATIONS, function(selected) {
      relation = selected;
    }).appendTo($container);

    $('<span>')
      .text(action2)
      .appendTo($container);

    $('<button>')
      .text('Submit')
      .click(function() {
        if (!relation) {
          return alert('Please select a relation between the two actions.');
        }

        $relations.find('fieldset').prop('disabled', true);

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
    text: 'has no effect on'
  }
];

function getSpan($container, tokens, takenIndices) {
  return new Promise(function(resolve, reject) {
    var $form = $('<form>');
    var selected = [];

    tokens.forEach(function(token, index) {
      var $button = $('<input type="button"/>')
      $button.val(token);
      $button.click(function() {
        $(this).toggleClass('selected');

        if (!_.includes(selected, index)) {
          selected.splice(_.sortedIndex(selected, index), 0, index);
        } else {
          selected.splice(selected.indexOf(index), 1);
        }
      });

      if (_.includes(takenIndices, index)) {
        $button.prop('disabled', true);
        $button.addClass('disabled');
      }

      $button.appendTo($form);
    });

    $submitButtons = $('<div class="submit-buttons">').appendTo($form);

    $('<input type="button" value="Submit"/>')
      .click(function() {
        if (selected.length === 0) {
          return alert('Please select at least one word.');
        }

        if (!isContiguous(selected)) {
          return alert('Please select a contiguous span of words.');
        }

        $form.remove();
        $('<p>').text(getTokens(tokens, selected)).appendTo($container);
        resolve(selected);
      })
      .appendTo($submitButtons);

    $('<input type="button" value="Invalid"/>')
      .click(function() {
        $form.remove();
        $('<p>').text('N/A').appendTo($container);
        resolve(null);
      })
      .appendTo($submitButtons);

    $form.appendTo($container);
  });
}

function getActionPhrase(verb, who, what) {
  if (who && what) return joinSpans([who, verb, what]);
  if (who) return joinSpans([who, verb]);
  if (what) return joinSpans([what, verb]);
  return joinSpans([verb]);
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
