import pandas as pd
from mturk_utils.annotation_collection import generate_task_page

sent_file = "./example_sentences.tsv"
df = pd.read_csv(sent_file, sep='\t', header=0)

print(df)
print()

def remove_non_ascii(s):
    return "".join(i for i in s if ord(i)<128)

def parse_verb_ids(s):
    return [[int(index) for index in span.split('-')] for span in s.split(',')]

for index, row in df.iterrows():

    html = generate_task_page(
        row.sentid,
        remove_non_ascii(row.sent).split(' '),
        parse_verb_ids(row.verbids)
    )
    
    path = './rendered_html/task_%d.html' % (row.sentid,)
    with open(path, 'w') as f:
        f.write(html)
        print('Wrote HIT for sentence %d to %s' % (row.sentid, path,))
