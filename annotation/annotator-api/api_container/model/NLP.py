import spacy
from nltk.stem import WordNetLemmatizer
from model.Options import WordConsolidation

def wordFilter(token, alphaFilter: bool):
    if (alphaFilter):
        return token.is_alpha and not token.is_stop
    return ((not token.is_punct) and (not token.is_stop))

wordNet = WordNetLemmatizer()

@spacy.Language.component("lemmatizer-WordNet")
def lemmatizerWordNet(doc):
    for token in doc:
        token.lemma_ = wordNet.lemmatize(token.text)

    return doc

def loadNLP():
    pipes = {}
    pipes[WordConsolidation.lemma_spaCy_sm] = spacy.load("en_core_web_sm", exclude=["ner"])
    # pipes[WordConsolidation.lemma_spaCy_md] = spacy.load("en_core_web_md", exclude=["ner"])
    # pipes[WordConsolidation.lemma_spaCy_lg] = spacy.load("en_core_web_lg", exclude=["ner"])
    # pipes[WordConsolidation.lemma_RoBERTa] = spacy.load("en_core_web_trf", exclude=["ner"])
    lemma_WordNetPipe = spacy.load("en_core_web_sm", exclude=["ner"])
    lemma_WordNetPipe.add_pipe("lemmatizer-WordNet")
    pipes[WordConsolidation.lemma_WordNet] = lemma_WordNetPipe

    return pipes

def getNLP(pipes, options):
    return pipes[options["consolidationMethod"]]