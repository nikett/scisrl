import json
import pandas as pd
from nltk.stem.wordnet import WordNetLemmatizer


# FIXME handle phrases.
def lemmatize_vp(unlemmatized):
    return WordNetLemmatizer().lemmatize(unlemmatized, 'v')


def present_form_of_vp(lemmatized):
    answer = verb_inflections_dict['verb_present'][lemmatized]
    return answer if answer is not None else ""


def past_form_of_vp(lemmatized):
    answer = verb_inflections_dict['verb_past'][lemmatized]
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
        'span': "["+start+"-"+end+"]",
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
    return json.dumps(data)
