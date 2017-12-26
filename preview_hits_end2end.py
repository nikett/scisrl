import json
from mturk_utils.annotation_collection import generate_task_page
import pandas as pd
from mturk_utils.nlp_util import parse_input

from pprint import pprint

def remove_non_ascii(s):
    return "".join(i for i in s if ord(i) < 128)

def parse_verb_ids(s):
    return [[int(index) for index in span.split('-')] for span in s.split(',')]


static_params = {
    'title': "Answer simple questions about the actions in a sentence.",
    'description': "Answer simple questions about the actions in a sentence.",
    'keywords': ['English verbs'],
    'frame_height': 1000,
    'amount': 0.01,
    'duration': 3600 * 1,
    'lifetime': 3600 * 24 * 2,
    'max_assignments': 5,
    'locales': ['US', 'CA', 'AU', 'NZ', 'GB']
}

if __name__ == '__main__':
    df = pd.read_csv('./example_sentences.tsv', sep='\t', header=0)
    for index, row in df.iterrows():
        sentence_json = parse_input(row.sentid, remove_non_ascii(row.sent), row.verbids)
        html = generate_task_page(sentence_json)
        path = './rendered_html/task_%d.html' % (sentence_json['id'],)
        with open(path, 'w') as f:
            f.write(html)
            print('Wrote HIT for sentence %d to %s' % (sentence_json['id'], path,))