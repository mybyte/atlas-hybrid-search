// Relative Score Fusion
import { useState, useEffect } from "react";
import axios from "axios";
import Results from "./results"
import { Label } from '@leafygreen-ui/typography';
import Button from '@leafygreen-ui/button';



function RSF({query,queryVector,schema}){
    const [results, setResults] = useState(null);

    // CONFIGURATION PARAMETERS
    const [config, setConfig] = useState({
        vector_scalar : {val:0.9,range:[0,1],step:0.1,comment:"Vector search score scaling factor (1 - fts_scalar)"},
        vector_normalization : {val:40,range:[0,100],step:5,comment:"Rough scaling of vector scores"},
        fts_scalar : {val:0.1,range:[0,1],step:0.1,comment:"FTS score scaling factor (1 - vector_scalar)"}, 
        fts_normalization : {val:10,range:[0,100],step:5,comment:"Rough scaling of full text search scores"}, 
        k : {val:10,range:[1,25],step:1,comment:"Number of results"},
        overrequest_factor : {val:10,range:[1,25],step:1,comment:"Multiplication factor of k for numCandidates for HNSW search"}
    })

    const resetConfig = () => {
        setConfig({
            vector_scalar : {val:0.9,range:[0,1],step:0.1,comment:"Vector search score scaling factor (1 - fts_scalar)"},
            vector_normalization : {val:40,range:[0,100],step:5,comment:"Rough scaling of vector scores"},
            fts_scalar : {val:0.1,range:[0,1],step:0.1,comment:"FTS score scaling factor (1 - vector_scalar)"}, 
            fts_normalization : {val:10,range:[0,100],step:5,comment:"Rough scaling of full text search scores"}, 
            k : {val:10,range:[1,25],step:1,comment:"Number of results"},
            overrequest_factor : {val:10,range:[1,25],step:1,comment:"Multiplication factor of k for numCandidates for HNSW search"}
        });
    }

    const handleSliderChange = (param, newValue) => {
        if(param == "fts_scalar"){
            setConfig({
                ...config,
                fts_scalar: {
                  ...config.fts_scalar,
                  val:newValue
                },
                vector_scalar: {
                    ...config.vector_scalar,
                    val: 1-newValue
                }
              });
        }else if(param == "vector_scalar"){
            setConfig({
                ...config,
                vector_scalar: {
                  ...config.vector_scalar,
                  val:newValue
                },
                fts_scalar: {
                    ...config.fts_scalar,
                    val: 1-newValue
                }
              });
        }else{
            setConfig({
                ...config,
                [param]: {
                  ...config[param],
                  val:newValue
                }
              });
        }
      };

    useEffect(() => {
        if(queryVector){
            search(query,queryVector,schema,config)
            .then(resp => setResults(resp.data.results))
            .catch(error => console.log(error));
        }
    
    },[queryVector,config]);

    return (
        <div style={{display:"grid",gridTemplateColumns:"20% 80%",gap:"5px",alignItems:"start"}}>
            <div>
                <h2>Relative Score Fusion Params</h2>
                <div style={{maxWidth:"60px"}}><Button onClick={()=>resetConfig()} variant="primary">Reset</Button></div>
                {Object.keys(config).map(param=>(
                    <>
                    <p key={param+"_title"}>{param}</p>
                    <p key={param+"_comment"}><i>{config[param]['comment']}</i></p>
                    <Label key={param}>
                        <input
                            key={param+'_slider'}
                            style={{verticalAlign:"bottom"}}
                            type="range"
                            min={config[param]['range'][0]} 
                            max={config[param]['range'][1]}
                            step={config[param]['step']} 
                            value={config[param]['val']} 
                            onChange={(e) => handleSliderChange(param, e.target.value)}
                        />
                        <input
                            key={param+'_box'}
                            style={{width:"3lvh"}}
                            type="text"
                            value={config[param]['val']} 
                            onChange={(e) => handleSliderChange(param, e.target.value)}
                        />
                    </Label>
                    </>
                ))}
            
            </div>
            <Results results={results} msg={"numCandidates: "+(config.k.val * config.overrequest_factor.val)}/>
        </div>
    )
}

export default RSF;

async function search(query,queryVector,schema,config) {
    

    const pipeline = [
        {
            $vectorSearch:{
                index: "vectorIndex",
                queryVector: queryVector,
                path:`${schema.vectorField}`,
                numCandidates: config.k.val * config.overrequest_factor.val,
                limit: config.k.val * 2
            }
        },
        {$addFields: {"vs_score": {$meta: "vectorSearchScore"}}},
        {
            $project:{
                title:`$${schema.titleField}`,
                image:`$${schema.imageField}`,
                description:`$${schema.descriptionField}`,
                vs_score:{$multiply: ["$vs_score", config.vector_scalar.val / config.vector_normalization.val]},
            }
        },
        {
            $unionWith: {
                "coll": "embedded_movies",
                "pipeline": [
                    {
                        $search: {
                            index: "searchIndex",
                            text: {query: query, path: {wildcard:"*"}},
                        }
                    },
                    {$limit: config.k.val * 2},
                    {$addFields: {fts_score: {$meta: "searchScore"}}},
                    {
                        $project: {
                            fts_score: {$multiply: ["$fts_score", config.fts_scalar.val / config.fts_normalization.val]},
                            title:`$${schema.titleField}`,
                            image:`$${schema.imageField}`,
                            description:`$${schema.descriptionField}`
                        }
                    },
                ],
            }
        },
        {
            $group: {
                _id: "$_id",
                vs_score: {$max: "$vs_score"},
                fts_score: {$max: "$fts_score"},
                title:{$first:"$title"},
                image:{$first:"$image"},
                description:{$first:"$description"}
            }
        },
        {
            $project: {
                _id: 1,
                title:1,
                image:1,
                description:1,
                vs_score: {$ifNull: ["$vs_score", 0]},
                fts_score: {$ifNull: ["$fts_score", 0]},
                score: {$add: ["$fts_score", "$vs_score"]},
            }
        },
        {$limit: config.k.val},
        {$sort: {"score": -1}},
    ]
    return new Promise((resolve) => {
        axios.post(`api/search`,
            { 
            pipeline : pipeline
            },
        ).then(response => resolve(response))
        .catch((error) => {
            console.log(error)
            resolve(error.response.data);
        })
    });
}