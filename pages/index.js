import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({override:true});

import Header from '../components/head';
import RSF from '../components/rsf';
import RRF from '../components/rrf';
import FTS from '../components/fts';
import VS from '../components/vs';
import RerankFusion from '../components/rerankFusion';
import SemanticBoosting from '../components/semanticBoosting';
import {SearchInput} from '@leafygreen-ui/search-input';
import { useState, } from 'react';
import Button from '@leafygreen-ui/button';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import AppBanner from '../components/banner';
import { ToastProvider, useToast } from '@leafygreen-ui/toast';
import LoadingIndicator from '../components/LoadingIndicator';
import schema from '../config.mjs';
import Modal from '@leafygreen-ui/modal';
import Code from '@leafygreen-ui/code';
import ExpandableCard from '@leafygreen-ui/expandable-card';
import { ModelProvider } from '../context/ModelContext';

const Home = () => {
  const { pushToast } = useToast();
  const [query, setQuery] = useState("");
  const [queryVector, setQueryVector] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [indexes, setIndexes] = useState(null);
  const [sample, setSample] = useState(null);
  const [open, setOpen] = useState(false);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      handleSearch();
    }
  }

  const handleSearch = () => {
    console.log("Search Clicked!")
    if(query && query != ""){
      setLoading(true);
      getQueryCache(query)
      .then(resp => {
        if(resp){
          console.log("Got cached query vector!");
          pushToast({timeout:10000,variant:"note",title:"Cache Hit",description:`Used cached embedding for ${query}`});
          setQueryVector(resp);
          setLoading(false);
        }else{
          embedQuery(query)
          .then(resp => {
            console.log("Query Embedded!")
            setQueryVector(resp);
            setLoading(false);
          })
          .catch(error => {
            console.log(error);
            pushToast({timeout:10000,variant:"warning",title:"API Failure",description:`Failed to encode query using embedding model. ${error}`});
          });
        }
      })
      .catch(error => {
        console.log(error);
        pushToast({timeout:10000,variant:"warning",title:"API Failure",description:`Failed to access query cache. ${error}`});
      });
    }
  }

  const handleShowIndexes = () => {
    console.log("Show Indexes Clicked!")
    getIndexes()
    .then(resp => {
      console.log("Indexes Fetched!")
      setIndexes(resp);
      setOpen("indexes");
    })
    .catch(error => {
      console.log(error);
      pushToast({timeout:10000,variant:"warning",title:"API Failure",description:`Failed to fetch indexes. ${error}`});
    });
  }

  const handleSampleDoc = () => {
    console.log("Sample Doc Clicked!")
    getSample()
    .then(resp => {
      console.log("Sample Doc Fetched!")
      setSample(resp);
      setOpen("sample");
    })
    .catch(error => {
      console.log(error);
      pushToast({timeout:10000,variant:"warning",title:"API Failure",description:`Failed to fetch sample. ${error}`});
    });
  }

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
    getQueryCache(event.target.value)
    .then(resp => {
      if(resp){
        console.log("Got cached query vector!");
        pushToast({timeout:10000,variant:"note",title:"Cache Hit",description:`Used cached embedding for ${event.target.value}`});
        setQueryVector(resp);
      }
    })
    .catch(error => {
      console.log(error);
    });
  };

  return (
    <>
    <Header/>
    <AppBanner heading="Atlas Hybrid Search Tester"></AppBanner>
    <div style={{display:"grid",gridTemplateColumns:"90% 120px",gap:"10px",alignItems:"start"}}>
      <div><SearchInput value={query} onChange={handleQueryChange} onKeyDown={(e)=>handleKeyPress(e)} aria-label="some label" style={{marginBottom:"20px"}}></SearchInput></div>
      <div style={{maxWidth:"120px"}}><Button onClick={()=>handleSearch()} variant="primary">Vector Search</Button></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"120px 120px",gap:"10px",alignItems:"start"}}>
      <div style={{maxWidth:"120px"}}><Button onClick={()=>handleShowIndexes()}>Show Indexes</Button></div>
      <div style={{maxWidth:"120px"}}><Button onClick={()=>handleSampleDoc()}>Sample Doc</Button></div>
    </div>
    {loading?<LoadingIndicator/>:<></>}
    <Tabs style={{marginTop:"15px"}} setSelected={setSelectedTab} selected={selectedTab}>
      <Tab name="About">
        <div style={{margin:"100px",marginTop:"50px"}}>
          <h1>About this application</h1>
          <p>This app helps you to test different strategies for combining lexical and vector search over a movie dataset. You can find source code here: <a href="https://github.com/JohnGUnderwood/atlas-hybrid-search">https://github.com/JohnGUnderwood/atlas-hybrid-search</a></p>
          <h2>Hybrid strategies</h2>
          <p>There are three strategies on the app at the moment, Relative Score Fusion, Reciproical Rank Fusion, and Semantic Boosting</p>
          <h3>Relative Score Fusion (RSF)</h3>
          <p>RSF combines the scores from lexical and vector search using a weighted sum. This implementation of RSF uses a sigmoid function, 1/(1+exp(-x)), to normalize lexical and vector scores before combining them.</p>
          <h3>Reciprocal Rank Fusion (RRF)</h3>
          <p>RRF combines lexical and vectors search using a weighted sum of their reciprocal rank. The reciprocal ranks of a result is 1/rank in the result list.</p>
          <h3>Semantic Boosting</h3>
          <p>In this strategy we use vector search to retrieve a given number of results. We then perform lexical search but boosting the unique ids of the documents returned by the vector search. This done by matching on the _id field and using the vector score as the boost value. The vector score is additive to the overall text score of the document and can be weighted by the user.</p>
          <h3>Rerank Fusion</h3>
          <p>Rerank Fusion combines lexical and vector search using a reranker. We let the reranker decide the best results, ignoring all previous scoring.</p>
          <h2>Reranking</h2>
          <h3>Rerank Results</h3>
          <p>When the application is run with a reranking model you can select to rerank the returned results from any of the retrieval strategies. This will send the result documents and query to the configued reranking model, which returns a new resorted result set.</p>
          <h2>How to use</h2>
          <p>Use the Fulltext and Vector search tabs to test your query using just one or other approaches. Then use the other tabs to see how your query performs with different strategies. Have fun!</p>
        </div>
      </Tab>
      <Tab name="Fulltext Search">
        <FTS query={query} schema={schema}/>
      </Tab>
      <Tab name="Vector Search">
        <VS query={query} queryVector={queryVector} schema={schema}/>
      </Tab>
      <Tab name="Relative Score Fusion">
        <RSF query={query} queryVector={queryVector} schema={schema}/>
      </Tab>
      <Tab name="Reciprocal Rank Fusion">
        <RRF query={query} queryVector={queryVector} schema={schema}/>
      </Tab>
      <Tab name="Semantic Boosting">
        <SemanticBoosting query={query} queryVector={queryVector} schema={schema}/>
      </Tab>
      <Tab name="Rerank Fusion">
        <RerankFusion query={query} queryVector={queryVector} schema={schema}/>
      </Tab>
    </Tabs>
    <Modal open={open} setOpen={setOpen}>
      { open == "indexes" ?
        <>
        <ExpandableCard
          title="Atlas Search"
          darkMode={false}
        >
          <Code language={'javascript'}>
            {indexes ? JSON.stringify(indexes.searchIndex,null,2) : "" }
          </Code>
        </ExpandableCard>
        <br/>    
        <ExpandableCard
          title="Atlas Vector Search"
          darkMode={false}
        >
          <Code language={'javascript'}>
            {indexes ? JSON.stringify(indexes.vectorIndex,null,2) : "" }
          </Code>
        </ExpandableCard>
        </>
        : open == "sample" ?
          <Code language={'javascript'}>
            {sample ? JSON.stringify(sample,null,2) : "" }
          </Code>
          : <></>
      }
    </Modal>
    </>
  )
}

async function embedQuery(query){
  try{
    const embeddingResp = await axios.get('api/embed?terms='+query);
    return embeddingResp.data;
  }catch (e) {
    throw e;
  }
}

async function getIndexes(){
  try{
    const response = await axios.get('api/indexes');
    return response.data;
  }catch (e) {
    throw e;
  }
}

async function getSample(){
  try{
    const response = await axios.get('api/sample');
    return response.data;
  }catch (e) {
    throw e;
  }
}

function getQueryCache(terms){
  return axios.get(`api/embed/cache?terms=${terms}`)
    .then(response => {
      if (response.status === 204) {
        return null; // Cache miss
      }else if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }else{
        return response.data; // Cache hit
      }
    })
    .catch(error => {
      throw error;
    });
}

export default function App(){
  return (
    <ModelProvider>
      <ToastProvider>
        <Home/>
      </ToastProvider>
    </ModelProvider>
  )
}