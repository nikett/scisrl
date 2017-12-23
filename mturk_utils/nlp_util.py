import json
import pandas as pd
from nltk.stem.wordnet import WordNetLemmatizer

prep = {"by", "to", "for", "with", "about", "from", "aboard", "about", "above", "across", "afore", "after", "against",
        "ahead", "along", "alongside", "amid", "amidst", "among", "amongst", "around", "as", "aside", "astride", "at",
        "atop", "before", "behind", "below", "beneath", "beside", "besides", "between", "beyond", "by", "despite",
        "down", "during", "except", "for", "from", "given", "in", "inside", "into", "near", "next", "of", "off", "on",
        "onto", "opposite", "out", "outside", "over", "pace", "per", "round", "since", "than", "through", "throughout",
        "till", "times", "to", "toward", "towards", "under", "underneath", "until", "unto", "up", "upon", "versus",
        "via", "with ", "within", "without"}


def is_prep(word):
    return False if not word else word.lower() in prep


# handles when first word is verb: go to=> went to, got cold=> gets cold
# performs no action if handle >=3 words
def lemmatize_vp(unlemmatized):
    if not unlemmatized:
        return ""
    words = unlemmatized.strip().split(' ')
    if (len(words) == 1):
        return lemmatize_verb(words[0])
    elif (len(words) == 2 and not is_prep(words[0])):
        return lemmatize_verb(words[0]) + " " + words[1]
    else:
        return unlemmatized


# handles when first word is verb: go to=> goes to
# performs no action if handle >=3 words
def present_form_of_vp(unlemmatized):
    if not unlemmatized:
        return ""
    words = unlemmatized.strip().split(' ')
    if (len(words) == 1):
        return present_form_of_verb(words[0])
    elif (len(words) == 2 and not is_prep(words[0])):
        return present_form_of_verb(words[0]) + " " + words[1]
    else:
        return unlemmatized


# handles when first word is verb: go to=> went to
# performs no action if handle >=3 words
def past_form_of_vp(unlemmatized):
    if not unlemmatized:
        return ""
    words = unlemmatized.strip().split(' ')
    if (len(words) == 1):
        return past_form_of_verb(words[0])
    elif (len(words) == 2 and not is_prep(words[0])):
        return past_form_of_verb(words[0]) + " " + words[1]
    else:
        return unlemmatized


def lemmatize_verb(unlemmatized):
    return "" if not unlemmatized else WordNetLemmatizer().lemmatize(unlemmatized.lower(), 'v')


def present_form_of_verb(unlemmatized):
    if not unlemmatized:
        return ""
    else:
        answer = verb_inflections_dict['verb_present'][unlemmatized]
        return answer if answer is not None else ""


def past_form_of_verb(unlemmatized):
    if not unlemmatized:
        return ""
    else:
        answer = verb_inflections_dict['verb_past'][unlemmatized]
        return answer if answer is not None else ""


#  verb_inflections_file ='mturk_utils/data_verb_inflections.tsv'
def load_verb_inflections(verb_inflections_file):
    inflections = pd.read_csv(verb_inflections_file, sep='\t', header=0)
    return inflections.set_index('verb').to_dict()

verb_inflections_dict = load_verb_inflections('mturk_utils/data_verb_inflections.tsv')


def json_resp_from(verb_span, tokenized_sent):
    start, end = verb_span.split('-')
    lemma = lemmatize_vp(' '.join(tokenized_sent[int(start): int(end)]))
    return {
        'span': [start, end],
        'lemma': lemma,
        'present': present_form_of_vp(lemma),
        'past': past_form_of_vp(lemma)
    }


def parse_input(sent_id, sent, csv_spans):
    tokenized_sent = str.split(sent, ' ')
    data = {'id': sent_id, 'tokens': tokenized_sent}
    verbs = []
    for verb_span in str.split(csv_spans, ','):
        verbs.append(json_resp_from(str.strip(verb_span), tokenized_sent))
    data['verbs'] = verbs
    return "["+json.dumps(data)+"]"  # the js code excepts arr of sent.
