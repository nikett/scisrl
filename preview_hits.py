import json
from mturk_utils.annotation_collection import generate_task_page

def remove_non_ascii(s):
    return "".join(i for i in s if ord(i) < 128)

def parse_verb_ids(s):
    return [[int(index) for index in span.split('-')] for span in s.split(',')]

with open('./example_sentences.json') as jsonf:
    sentences = json.load(jsonf)

    for sentence in sentences:
        html = generate_task_page(sentence)
        path = './rendered_html/task_%d.html' % (sentence['id'],)
        with open(path, 'w') as f:
            f.write(html)
            print('Wrote HIT for sentence %d to %s' % (sentence['id'], path,))
