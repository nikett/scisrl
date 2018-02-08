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


#  verb_inflections_file ='mturk_utils/data_verb_inflections.tsv'
def load_verb_inflections(verb_inflections_file):
    inflections = pd.read_csv(verb_inflections_file, sep='\t', header=0)
    return inflections.set_index('verb').to_dict()

#  noun_verb_derivations_file ='mturk_utils/wn_noun_verb_derivational.tsv'
def load_noun_verb_derivations(noun_verb_derivations_file):
    inflections = pd.read_csv(noun_verb_derivations_file, sep='\t', header=0)
    return inflections.set_index('noun').to_dict()


verb_inflections_dict = load_verb_inflections('mturk_utils/data_verb_inflections.tsv')
noun_verb_derivations_dict = load_noun_verb_derivations('mturk_utils/noun_verb_derivations.tsv')
lemmatizer = WordNetLemmatizer()

def is_prep(word):
    return False if not word else word.lower() in prep


def lemmatize_verb(unlemmatized_with_puncts):
    lemma = ""
    try:
        if unlemmatized_with_puncts:  # Not none or empty
            ch_arr = [ch for ch in unlemmatized_with_puncts.lower() if ord(ch) >= ord('a') and ord(ch) <= ord('z')]
            if not ch_arr:
                return ""
            unlemmatized = ''.join(ch_arr)
            # Verbal event
            lemma = lemmatizer.lemmatize(unlemmatized.lower(), 'v')
            # Could be a nominal event such as, growth, notification, normalize as noun.
            if lemma not in verb_inflections_dict['verb_present']:
                lemma = lemmatizer.lemmatize(noun_verb_derivations_dict['verb'].get(lemma, lemma), 'v')
        return lemma
    except:
        print("Exception while lemmatizing verb", unlemmatized_with_puncts)
        return lemma


# handles when first word is verb: go to=> went to, got cold=> gets cold
# performs no action if handle >=3 words
def lemmatize_vp(unlemmatized):
    if not unlemmatized:
        return ""
    words = prune_inessential_words_from(unlemmatized.strip()).split(' ')
    if not words:
        return ""
    return lemmatize_verb(words[0]) + (" " + " ".join(words[1:]) if len(words) > 1 else "")


# handles when first word is verb: go to=> goes to
# performs no action if handle >=3 words
def present_form_of_vp(lemmatized):
    if not lemmatized:
        return ""
    words = prune_inessential_words_from(lemmatized.strip()).split(' ')
    if not words:
        return ""
    return present_form_of_verb(lemmatize_verb(words[0])) + (" " + " ".join(words[1:]) if len(words) > 1 else "")


# handles when first word is verb: go to=> went to
# performs no action if handle >=3 words
def past_form_of_vp(lemmatized):
    if not lemmatized:
        return ""
    words = prune_inessential_words_from(lemmatized.strip()).split(' ')
    if not words:
        return ""
    return past_form_of_verb(lemmatize_verb(words[0])) + (" " + " ".join(words[1:]) if len(words) > 1 else "")


## 1. Drop leading modals/ stop words =>  can, could, would, may be, can be, could have been, be
# can solve => who solves, what is solved
first_words_to_remove = set(
    ["can", "could", "may", "might", "will", "would", "must", "shall", "should", "ought", "to", "be", "being", "is",
     "was", "were"])
## 2. Leading has/have/had => be
# would have used => who uses/ what is used
second_words_to_remove = set(["have", "had", "has", "be", "being"])
## 3. Override the previous changes when there are negations
# would not have used => who will not have used/ what is would not have used
# would not travel => who will not travel/ what is would not travel
remaining_leading_word_alert = set(["not"])  # return the original vp.


# Function that applies the logic above to return head_vp from a verb phrase
def prune_inessential_words_from(vp):
    if not vp:
        return ""
    words = vp.strip().split()
    if len(words) == 1:
        return vp
    if len(words) == 2:
        if words[0] in first_words_to_remove:
            return words[1]
        else:
            return vp

    # 3+ words.
    flag1 = words[0] in first_words_to_remove
    flag2 = words[1] in second_words_to_remove
    flag3 = words[1] in remaining_leading_word_alert or words[2] in remaining_leading_word_alert
    if flag3 or (not flag1 and not flag2):
        return vp
    if flag1 and flag2:
        return ' '.join(words[2:])
    if flag1 and not flag2:
        return ' '.join(words[1:])
    return vp


def present_form_of_verb(unlemmatized_with_puncts):
    if not unlemmatized_with_puncts:
        return ""
    else:
        ch_arr = [ch for ch in unlemmatized_with_puncts.lower() if ord(ch) >= ord('a') and ord(ch) <= ord('z')]
        if not ch_arr:
            return ""
        unlemmatized = ''.join(ch_arr)
        if unlemmatized in verb_inflections_dict['verb_present']:
            answer = verb_inflections_dict['verb_present'][unlemmatized]
            return answer if answer is not None else ""
        else:
            # print "keyerror (present) prevented for ", unlemmatized
            return unlemmatized


def past_form_of_verb(unlemmatized_with_puncts):
    if not unlemmatized_with_puncts:
        return ""
    else:
        ch_arr = [ch for ch in unlemmatized_with_puncts.lower() if ord(ch) >= ord('a') and ord(ch) <= ord('z')]
        if not ch_arr:
            return ""
        unlemmatized = ''.join(ch_arr)
        if unlemmatized in verb_inflections_dict['verb_past']:
            answer = verb_inflections_dict['verb_past'][unlemmatized]
            return answer if answer is not None else ""
        else:
        #     print "keyerror (past) prevented for ", unlemmatized
            return unlemmatized


def json_resp_from(verb_span, tokenized_sent):
    start, end = verb_span.split('-')
    lemma = lemmatize_vp(' '.join(tokenized_sent[int(start): int(end)])).lower()

    # if "stones and pips pass" in ' '.join(tokenized_sent):
    #     print "Niket debugging: ", ' '.join(tokenized_sent), "\n", \
    #           str(lemma), "=>", str(present_form_of_vp(lemma)),"=>", str(past_form_of_vp(lemma))

    return {
        'span': [int(start), int(end)],
        'lemma': str(lemma),
        'present': str(present_form_of_vp(lemma)),
        'past': str(past_form_of_vp(lemma))
    }


def parse_input(sent_id, sent, csv_spans):
    tokenized_sent = str.split(sent, ' ')
    data = {'id': sent_id, 'tokens': tokenized_sent}
    verbs = []
    for verb_span in str.split(csv_spans, ','):
        try:
            verbs.append(json_resp_from(str.strip(verb_span), tokenized_sent))
        except:
            print("This sentence:", sent, "has incorrect verb span range: ", csv_spans)
    data['verbs'] = verbs
    # the js code expect an obj and so
    # any attempt to use the dict directly fails with json.dumps(data)
    return data
