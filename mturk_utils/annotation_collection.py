import pickle
from collections import defaultdict
from jinja2 import Environment, FileSystemLoader
import os
import json
from nltk.tokenize import sent_tokenize
import PIL.Image as Image
import requests
from .nlp_util import parse_input


from boto.mturk.qualification import PercentAssignmentsApprovedRequirement, Qualifications, Requirement, LocaleRequirement


def create_result(assmt):
    result = json.loads(assmt.answers[0][0].fields[0])
    result['h_id'] = assmt.HITId
    return result


def pickle_this(results_df, file_name):
    with open(file_name, 'w') as f:
        pickle.dump(results_df, f)


def un_pickle_this(file_name):
    with open(file_name, 'r') as f:
        results_df = pickle.load(f)
    return results_df


def filter_hits_by_date(hit_group, start_date, end_date):
    import pytz
    import dateutil.parser as dt_parse
    import datetime

    start_datetime = datetime.datetime(*start_date).replace(tzinfo=pytz.UTC)
    end_datetime = datetime.datetime(*end_date).replace(tzinfo=pytz.UTC)
    return [hit for hit in hit_group if start_datetime < dt_parse.parse(hit.CreationTime) < end_datetime]


def filter_hits_by_completion(hit_group, n_assigments=3):
    return [hit for hit in hit_group if int(hit.NumberOfAssignmentsCompleted) == n_assigments]


def filter_hits_by_status(hit_group, status='Reviewable'):
    return [hit for hit in hit_group if hit.HITStatus == status]


def get_completed_hits(mturk_connection):
    """
    Queries amt for all active user HITs.
    :param mturk_connection: active mturk connection established by user in the nb.
    :return: list of boto HIT result objects
    """
    reviewable_hits = []
    page_n = 1
    hits_left = True
    while hits_left:
        hit_range = mturk_connection.get_reviewable_hits(page_size=100, page_number=page_n)
        if not hit_range:
            hits_left = False
            break
        reviewable_hits.extend(hit_range)
        page_n += 1
    return reviewable_hits


def get_assignments(mturk_connection, reviewable_hits, status=None):
    """
    Retrieves individual assignments associated with the specified HITs.
    :param mturk_connection: active mturk connection established by user in the nb.
    :param reviewable_hits: HITs to review
    :param status: HIT status to filter by.
    :return: hit_id:assignment dict
    """
    assignments = defaultdict(list)
    for hit in reviewable_hits:
        assignment = mturk_connection.get_assignments(hit.HITId, status=status)
        assignments[hit.HITId].extend(assignment)
    return assignments


def build_hit_params(qhtml, static_params):
    """
    Dynamically builds some HIT params that will change based on the book/url
    :param url: formatted url of page image on s3
    :param static_params: Universal HIT params (set by user in notebook).
    :return: complete HIT parameters.
    """
    import copy
    import boto

    def build_qualifications(locales=None):
        """
        Creates a single qualification that workers have a > 95% acceptance rate.
        :return: boto qualification obj.
        """
        qualifications = Qualifications()
        requirements = [PercentAssignmentsApprovedRequirement(comparator="GreaterThan", integer_value="95")]
        if locales:
            loc_req = LocaleRequirement(
                    comparator='In',
                    locale=locales)
            requirements.append(loc_req)
        _ = [qualifications.add(req) for req in requirements]
        return qualifications
    if 'locales' not in static_params:
        static_params['locales'] = None
    hit_params = copy.deepcopy(static_params)
    hit_params['qualifications'] = build_qualifications(static_params['locales'])
    hit_params['reward'] = boto.mturk.price.Price(hit_params['amount'])
    hit_params['html'] = qhtml
    return hit_params


def write_task_page(page_html):
    html_dir = './rendered_html'
    html_out_file = os.path.join(html_dir, 'char_bbox.html')
    if not os.path.exists(html_dir):
        os.makedirs(html_dir)
    with open(html_out_file, 'w') as f:
        f.write(page_html.encode('utf8'))
        # f.write(page_html)


def generate_task_page(sentence, template_file='task_template.html'):
    env = Environment(loader=FileSystemLoader('hit_templates'))
    template = env.get_template(template_file)
    page_html = template.render(sentence=sentence)
    return page_html


def prepare_hit(global_id, text, verb_spans, static_parameters):
    if verb_spans:
    	formatted_text = parse_input(global_id, text, verb_spans)
    	question_html = generate_task_page(formatted_text)
    	return build_hit_params(question_html, static_parameters)
    else:
        print "Debug: empty verb spans in:", text  
        return None
