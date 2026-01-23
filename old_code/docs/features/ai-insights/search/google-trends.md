Google Trends API
API uptime
92.563%
Our Google Trends API allows you to scrape results from the Google Trends search page. The API is accessed through the following endpoint: /search?engine=google_trends.

A user may query the following: https://serpapi.com/search?engine=google_trends utilizing a GET request. Head to the playground for a live and interactive demo.

API Parameters
Search Query
q

Required

Parameter defines the query or queries you want to search. You can use anything that you would use in a regular Google Trends search. The maximum number of queries per search is 5 (this only applies to "Interest over time" and "Compared breakdown by region" data_type, other types of data will only accept 1 query per search).

When passing multiple queries you need to use a comma (,) to separate them (e.g. coffee,pizza,dark chocolate,/m/027lnzs,bread).

Query can be a "Search term" (e.g. World Cup, Eminem, iPhone, etc.) or a "Topic" (e.g. /m/0663v, /m/027lnzs, /g/11mw8j71m4, etc.). Queries that are "Topics" are encoded. To retrieve these values you can use our Google Trends Autocomplete API.

Maximum length for each query is 100 characters.

Geographic Location
hl

Optional

Parameter defines the language to use for the Google Trends search. It's a two-letter language code. (e.g., en for English, es for Spanish, or fr for French). Head to the Google languages page for a full list of supported Google languages.

geo

Optional

Parameter defines the location from where you want the search to originate. It defaults to Worldwide (activated when the value of geo parameter is not set or empty). Head to the Google Trends Locations for a full list of supported Google Trends locations.

region

Optional

Parameter is used for getting more specific results when using "Compared breakdown by region" and "Interest by region" data_type charts. Other data_type charts do not accept region parameter. The default value depends on the geo location that is set. Available options:

COUNTRY - Country
REGION - Subregion
DMA - Metro
CITY - City

Not all region options will return results for every geo location.

Search Type
data_type

Optional

Parameter defines the type of search you want to do. Available options:

TIMESERIES - Interest over time (default) - Accepts both single and multiple queries per search.
GEO_MAP - Compared breakdown by region - Accepts only multiple queries per search.
GEO_MAP_0 - Interest by region - Accepts only single query per search.
RELATED_TOPICS - Related topics - Accepts only single query per search.
RELATED_QUERIES - Related queries - Accepts only single query per search.

Advanced Google Trends Parameters
tz

Optional

Parameter is used to define a time zone offset. The default value is set to 420 (Pacific Day Time(PDT): -07:00). Value is shown in minutes and can span from -1439 to 1439.

tz can be calculated using the time difference between UTC +0 and desired timezone.

Examples:
420 - PDT
600 - Pacific/Tahiti
-540 - Asia/Tokyo
-480 - Canada/Pacific.

To make sure the value is correct, please refer to the time zone database and your programming language UTC offset calculation. You may visit the documentation to get more information.

cat

Optional

Parameter is used to define a search category. The default value is 0 (All categories). You can find or download all supported values in the Google Trends Categories list. Note that these are different from the categories supported for Google Trends Trending Now

gprop

Optional

Parameter is used for sorting results by property. The default property is set to Web Search (activated when the value of gprop parameter is not set or empty). Other available options:

images - Image Search
news - News Search
froogle - Google Shopping
youtube - YouTube Search

date

Optional

Parameter is used to define a date. Available options:

now 1-H - Past hour
now 4-H - Past 4 hours
now 1-d - Past day
now 7-d - Past 7 days
today 1-m - Past 30 days
today 3-m - Past 90 days
today 12-m - Past 12 months
today 5-y - Past 5 years
all - 2004 - present

You can also pass custom values:

Dates from 2004 to present: yyyy-mm-dd yyyy-mm-dd (e.g. 2021-10-15 2022-05-25)
Dates with hours within a week range: yyyy-mm-ddThh yyyy-mm-ddThh (e.g. 2022-05-19T10 2022-05-24T22). Hours will be calculated depending on the tz (time zone) parameter.

csv

Optional

Parameter is used for retrieving the CSV results. Set the parameter to true to retrieve CSV results as an array.

include_low_search_volume

Optional

Parameter is used for including low search volume regions in the results. Set the parameter to true to include low search volume regions in the results.

This parameter is ignored if data_type is not set to GEO_MAP or GEO_MAP_0.

Serpapi Parameters
engine

Required

Set parameter to google_trends to use the Google Trends API engine.

no_cache

Optional

Parameter will force SerpApi to fetch the Google Trends results even if a cached version is already present. A cache is served only if the query and all parameters are exactly the same. Cache expires after 1h. Cached searches are free, and are not counted towards your searches per month. It can be set to false (default) to allow results from the cache, or true to disallow results from the cache. no_cache and async parameters should not be used together.

async

Optional

Parameter defines the way you want to submit your search to SerpApi. It can be set to false (default) to open an HTTP connection and keep it open until you got your search results, or true to just submit your search to SerpApi and retrieve them later. In this case, you'll need to use our Searches Archive API to retrieve your results. async and no_cache parameters should not be used together. async should not be used on accounts with Ludicrous Speed enabled.

zero_trace

Optional

Enterprise only. Parameter enables ZeroTrace mode. It can be set to false (default) or true. Enable this mode to skip storing search parameters, search files, and search metadata on our servers. This may make debugging more difficult.

api_key

Required

Parameter defines the SerpApi private key to use.

output

Optional

Parameter defines the final output you want. It can be set to json (default) to get a structured JSON of the results, or html to get the raw html retrieved.

json_restrictor

Optional

Parameter defines the fields you want to restrict in the outputs for smaller, faster responses. See JSON Restrictor for more details.

API Results
JSON Results
JSON output includes structured data for Interest over time, Compared breakdown by region, Interest by region, Related queries and Related topics.

A search status is accessible through search_metadata.status. It flows this way: Processing -> Success || Error. If a search has failed, error will contain an error message. search_metadata.id is the search ID inside SerpApi.

HTML Results
HTML output is useful to debug JSON results or support features not supported yet by SerpApi. HTML output gives you the raw HTML results from Google Trends.
This API does not have html response, just a text. search_metadata.prettify_html_file contains prettified version of the result. It is displayed in the playground.

API Examples
Interest over time chart with 
q
:
coffee,milk,bread,pasta,steak
and 
data_type
:
TIMESERIES
GET


https://serpapi.com/search.json?engine=google_trends&q=coffee,milk,bread,pasta,steak&data_type=TIMESERIES

Code to integrate


Ruby

require "serpapi" 

client = SerpApi::Client.new(
  engine: "google_trends",
  q: "coffee,milk,bread,pasta,steak",
  data_type: "TIMESERIES",
  api_key: "1e3bd61c96d4412032799f0c8b3509ad902b53b67122ea37695364cc094663d4"
)

results = client.search
interest_over_time = results[:interest_over_time]

JSON Example

{
  "search_metadata": {
    "id": "628e1083de983400a3b29c2e",
    "status": "Success",
    "json_endpoint": "https://serpapi.com/searches/c1bde9cbd0a44437/628e1083de983400a3b29c2e.json",
    "created_at": "2022-05-25 11:18:27 UTC",
    "processed_at": "2022-05-25 11:18:27 UTC",
    "google_trends_url": "https://trends.google.com/trends/api/explore?tz=420&req=%7B%22comparisonItem%22%3A%5B%7B%22keyword%22%3A%22coffee%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22today+12-m%22%7D%2C%7B%22keyword%22%3A%22milk%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22today+12-m%22%7D%2C%7B%22keyword%22%3A%22bread%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22today+12-m%22%7D%2C%7B%22keyword%22%3A%22pasta%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22today+12-m%22%7D%2C%7B%22keyword%22%3A%22steak%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22today+12-m%22%7D%5D%2C%22category%22%3A0%2C%22property%22%3A%22%22%7D",
    "raw_html_file": "https://serpapi.com/searches/c1bde9cbd0a44437/628e1083de983400a3b29c2e.html",
    "prettify_html_file": "https://serpapi.com/searches/c1bde9cbd0a44437/628e1083de983400a3b29c2e.prettify",
    "total_time_taken": 1.89
  },
  "search_parameters": {
    "engine": "google_trends",
    "q": "coffee,milk,bread,pasta,steak",
    "date": "today 12-m",
    "tz": "420",
    "data_type": "TIMESERIES"
  },
  "interest_over_time": {
    "timeline_data": [
      {
        "date": "May 30 – Jun 5, 2021",
        "timestamp": "1622304000",
        "values": [
          {
            "query": "coffee",
            "value": "80",
            "extracted_value": 80
          },
          {
            "query": "milk",
            "value": "58",
            "extracted_value": 58
          },
          {
            "query": "bread",
            "value": "35",
            "extracted_value": 35
          },
          ...
        ]
      },
      {
        "date": "Jun 6 – 12, 2021",
        "timestamp": "1622822400",
        "values": [
          {
            "query": "coffee",
            "value": "75",
            "extracted_value": 75
          },
          {
            "query": "milk",
            "value": "54",
            "extracted_value": 54
          },
          {
            "query": "bread",
            "value": "35",
            "extracted_value": 35
          },
          ...
        ]
      },
      {
        "date": "Jun 13 – 19, 2021",
        "timestamp": "1623513600",
        "values": [
          {
            "query": "coffee",
            "value": "78",
            "extracted_value": 78
          },
          {
            "query": "milk",
            "value": "54",
            "extracted_value": 54
          },
          {
            "query": "bread",
            "value": "35",
            "extracted_value": 35
          },
          ...
        ]
      },
      ...
    ],
    "averages": [
      {
        "query": "coffee",
        "value": 84
      },
      {
        "query": "milk",
        "value": 55
      },
      {
        "query": "bread",
        "value": 39
      },
      ...
    ]
  }
}
Compared breakdown by region chart with 
q
:
coffee,milk,bread,pasta,steak
and 
data_type
:
GEO_MAP
GET


https://serpapi.com/search.json?engine=google_trends&q=coffee,milk,bread,pasta,steak&data_type=GEO_MAP

Code to integrate


Ruby

require "serpapi" 

client = SerpApi::Client.new(
  engine: "google_trends",
  q: "coffee,milk,bread,pasta,steak",
  data_type: "GEO_MAP",
  api_key: "1e3bd61c96d4412032799f0c8b3509ad902b53b67122ea37695364cc094663d4"
)

results = client.search
compared_breakdown_by_region = results[:compared_breakdown_by_region]

JSON Example

{
  "search_metadata": {
    "id": "628e1291de983400a5961cdc",
    "status": "Success",
    "json_endpoint": "https://serpapi.com/searches/c1bde9cbd0a44437/628e1291de983400a5961cdc.json",
    "created_at": "2022-05-25 11:27:13 UTC",
    "processed_at": "2022-05-25 11:27:14 UTC",
    "google_trends_url": "https://trends.google.com/trends/api/explore?tz=420&req=%7B%22comparisonItem%22%3A%5B%7B%22keyword%22%3A%22coffee%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22today+12-m%22%7D%2C%7B%22keyword%22%3A%22milk%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22today+12-m%22%7D%2C%7B%22keyword%22%3A%22bread%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22today+12-m%22%7D%2C%7B%22keyword%22%3A%22pasta%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22today+12-m%22%7D%2C%7B%22keyword%22%3A%22steak%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22today+12-m%22%7D%5D%2C%22category%22%3A0%2C%22property%22%3A%22%22%7D",
    "raw_html_file": "https://serpapi.com/searches/c1bde9cbd0a44437/628e1291de983400a5961cdc.html",
    "prettify_html_file": "https://serpapi.com/searches/c1bde9cbd0a44437/628e1291de983400a5961cdc.prettify",
    "total_time_taken": 1.73
  },
  "search_parameters": {
    "engine": "google_trends",
    "q": "coffee,milk,bread,pasta,steak",
    "date": "today 12-m",
    "tz": "420",
    "data_type": "GEO_MAP"
  },
  "compared_breakdown_by_region": [
    {
      "geo": "SG",
      "location": "Singapore",
      "max_value_index": 0,
      "values": [
        {
          "query": "coffee",
          "value": "43%",
          "extracted_value": 43
        },
        {
          "query": "milk",
          "value": "25%",
          "extracted_value": 25
        },
        {
          "query": "bread",
          "value": "16%",
          "extracted_value": 16
        },
        ...
      ]
    },
    {
      "geo": "IT",
      "location": "Italy",
      "max_value_index": 3,
      "values": [
        {
          "query": "coffee",
          "value": "5%",
          "extracted_value": 5
        },
        {
          "query": "milk",
          "value": "3%",
          "extracted_value": 3
        },
        {
          "query": "bread",
          "value": "2%",
          "extracted_value": 2
        },
        ...
      ]
    },
    {
      "geo": "AU",
      "location": "Australia",
      "max_value_index": 0,
      "values": [
        {
          "query": "coffee",
          "value": "38%",
          "extracted_value": 38
        },
        {
          "query": "milk",
          "value": "21%",
          "extracted_value": 21
        },
        {
          "query": "bread",
          "value": "17%",
          "extracted_value": 17
        },
        ...
      ]
    },
    ...
  ]
}
Interest by region chart with 
q
:
coffee
and 
data_type
:
GEO_MAP_0
GET


https://serpapi.com/search.json?engine=google_trends&q=coffee&data_type=GEO_MAP_0

Code to integrate


Ruby

require "serpapi" 

client = SerpApi::Client.new(
  engine: "google_trends",
  q: "coffee",
  data_type: "GEO_MAP_0",
  api_key: "1e3bd61c96d4412032799f0c8b3509ad902b53b67122ea37695364cc094663d4"
)

results = client.search
interest_by_region = results[:interest_by_region]

JSON Example

{
  "search_metadata": {
    "id": "628e13d2de983400a5961cdf",
    "status": "Success",
    "json_endpoint": "https://serpapi.com/searches/15f6e17aed843e35/628e13d2de983400a5961cdf.json",
    "created_at": "2022-05-25 11:32:34 UTC",
    "processed_at": "2022-05-25 11:32:34 UTC",
    "google_trends_url": "https://trends.google.com/trends/api/explore?tz=420&req=%7B%22comparisonItem%22%3A%5B%7B%22keyword%22%3A%22coffee%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22today+12-m%22%7D%5D%2C%22category%22%3A0%2C%22property%22%3A%22%22%7D",
    "raw_html_file": "https://serpapi.com/searches/15f6e17aed843e35/628e13d2de983400a5961cdf.html",
    "prettify_html_file": "https://serpapi.com/searches/15f6e17aed843e35/628e13d2de983400a5961cdf.prettify",
    "total_time_taken": 1.85
  },
  "search_parameters": {
    "engine": "google_trends",
    "q": "coffee",
    "date": "today 12-m",
    "tz": "420",
    "data_type": "GEO_MAP_0"
  },
  "interest_by_region": [
    {
      "geo": "SG",
      "location": "Singapore",
      "max_value_index": 0,
      "value": "100",
      "extracted_value": 100
    },
    {
      "geo": "AU",
      "location": "Australia",
      "max_value_index": 0,
      "value": "87",
      "extracted_value": 87
    },
    {
      "geo": "NZ",
      "location": "New Zealand",
      "max_value_index": 0,
      "value": "77",
      "extracted_value": 77
    },
    ...
  ]
}
Related topics chart with 
q
:
coffee
and 
data_type
:
RELATED_TOPICS
GET


https://serpapi.com/search.json?engine=google_trends&q=coffee&data_type=RELATED_TOPICS

Code to integrate


Ruby

require "serpapi" 

client = SerpApi::Client.new(
  engine: "google_trends",
  q: "coffee",
  data_type: "RELATED_TOPICS",
  api_key: "1e3bd61c96d4412032799f0c8b3509ad902b53b67122ea37695364cc094663d4"
)

results = client.search
related_topics = results[:related_topics]

JSON Example

{
  "search_metadata": {
    "id": "628e148bde983400a3b29c2f",
    "status": "Success",
    "json_endpoint": "https://serpapi.com/searches/15f6e17aed843e35/628e148bde983400a3b29c2f.json",
    "created_at": "2022-05-25 11:35:39 UTC",
    "processed_at": "2022-05-25 11:35:39 UTC",
    "google_trends_url": "https://trends.google.com/trends/api/explore?tz=420&req=%7B%22comparisonItem%22%3A%5B%7B%22keyword%22%3A%22coffee%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22today+12-m%22%7D%5D%2C%22category%22%3A0%2C%22property%22%3A%22%22%7D",
    "raw_html_file": "https://serpapi.com/searches/15f6e17aed843e35/628e148bde983400a3b29c2f.html",
    "prettify_html_file": "https://serpapi.com/searches/15f6e17aed843e35/628e148bde983400a3b29c2f.prettify",
    "total_time_taken": 1.92
  },
  "search_parameters": {
    "engine": "google_trends",
    "q": "coffee",
    "date": "today 12-m",
    "tz": "420",
    "data_type": "RELATED_TOPICS"
  },
  "related_topics": {
    "rising": [
      {
        "topic": {
          "value": "/g/11qrhc4zy2",
          "title": "Coffee and lemon",
          "type": "Food"
        },
        "value": "+2,300%",
        "extracted_value": 2300,
        "link": "https://trends.google.com/trends/explore?q=/g/11qrhc4zy2&date=today+12-m",
        "serpapi_link": "https://serpapi.com/search.json?data_type=RELATED_TOPICS&date=today+12-m&engine=google_trends&q=/g/11qrhc4zy2&tz=420"
      },
      {
        "topic": {
          "value": "/m/09k_b",
          "title": "Lemon",
          "type": "Fruit"
        },
        "value": "+450%",
        "extracted_value": 450,
        "link": "https://trends.google.com/trends/explore?q=/m/09k_b&date=today+12-m",
        "serpapi_link": "https://serpapi.com/search.json?data_type=RELATED_TOPICS&date=today+12-m&engine=google_trends&q=/m/09k_b&tz=420"
      },
      {
        "topic": {
          "value": "/m/0cp66xy",
          "title": "Tata Coffee",
          "type": "Company"
        },
        "value": "+80%",
        "extracted_value": 80,
        "link": "https://trends.google.com/trends/explore?q=/m/0cp66xy&date=today+12-m",
        "serpapi_link": "https://serpapi.com/search.json?data_type=RELATED_TOPICS&date=today+12-m&engine=google_trends&q=/m/0cp66xy&tz=420"
      },
      ...
    ],
    "top": [
      {
        "topic": {
          "value": "/m/02vqfm",
          "title": "Coffee",
          "type": "Drink"
        },
        "value": "100",
        "extracted_value": 100,
        "link": "https://trends.google.com/trends/explore?q=/m/02vqfm&date=today+12-m",
        "serpapi_link": "https://serpapi.com/search.json?data_type=RELATED_TOPICS&date=today+12-m&engine=google_trends&q=/m/02vqfm&tz=420"
      },
      {
        "topic": {
          "value": "/m/020fb2",
          "title": "Cafe",
          "type": "Topic"
        },
        "value": "12",
        "extracted_value": 12,
        "link": "https://trends.google.com/trends/explore?q=/m/020fb2&date=today+12-m",
        "serpapi_link": "https://serpapi.com/search.json?data_type=RELATED_TOPICS&date=today+12-m&engine=google_trends&q=/m/020fb2&tz=420"
      },
      {
        "topic": {
          "value": "/m/07xyvk",
          "title": "Coffeemaker",
          "type": "Topic"
        },
        "value": "10",
        "extracted_value": 10,
        "link": "https://trends.google.com/trends/explore?q=/m/07xyvk&date=today+12-m",
        "serpapi_link": "https://serpapi.com/search.json?data_type=RELATED_TOPICS&date=today+12-m&engine=google_trends&q=/m/07xyvk&tz=420"
      },
      ...
    ]
  }
}
Related queries chart with 
q
:
coffee
and 
data_type
:
RELATED_QUERIES
GET


https://serpapi.com/search.json?engine=google_trends&q=coffee&data_type=RELATED_QUERIES

Code to integrate


Ruby

require "serpapi" 

client = SerpApi::Client.new(
  engine: "google_trends",
  q: "coffee",
  data_type: "RELATED_QUERIES",
  api_key: "1e3bd61c96d4412032799f0c8b3509ad902b53b67122ea37695364cc094663d4"
)

results = client.search
related_queries = results[:related_queries]

JSON Example

{
  "search_metadata": {
    "id": "628e1571de983400a5961ce1",
    "status": "Success",
    "json_endpoint": "https://serpapi.com/searches/15f6e17aed843e35/628e1571de983400a5961ce1.json",
    "created_at": "2022-05-25 11:39:29 UTC",
    "processed_at": "2022-05-25 11:39:29 UTC",
    "google_trends_url": "https://trends.google.com/trends/api/explore?tz=420&req=%7B%22comparisonItem%22%3A%5B%7B%22keyword%22%3A%22coffee%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22today+12-m%22%7D%5D%2C%22category%22%3A0%2C%22property%22%3A%22%22%7D",
    "raw_html_file": "https://serpapi.com/searches/15f6e17aed843e35/628e1571de983400a5961ce1.html",
    "prettify_html_file": "https://serpapi.com/searches/15f6e17aed843e35/628e1571de983400a5961ce1.prettify",
    "total_time_taken": 1.84
  },
  "search_parameters": {
    "engine": "google_trends",
    "q": "coffee",
    "date": "today 12-m",
    "tz": "420",
    "data_type": "RELATED_QUERIES"
  },
  "related_queries": {
    "rising": [
      {
        "query": "coffee and lemon for weight loss",
        "value": "+4,200%",
        "extracted_value": 4200,
        "link": "https://trends.google.com/trends/explore?q=coffee+and+lemon+for+weight+loss&date=today+12-m",
        "serpapi_link": "https://serpapi.com/search.json?data_type=RELATED_QUERIES&date=today+12-m&engine=google_trends&q=coffee+and+lemon+for+weight+loss&tz=420"
      },
      {
        "query": "takeout coffee nearby",
        "value": "+2,750%",
        "extracted_value": 2750,
        "link": "https://trends.google.com/trends/explore?q=takeout+coffee+nearby&date=today+12-m",
        "serpapi_link": "https://serpapi.com/search.json?data_type=RELATED_QUERIES&date=today+12-m&engine=google_trends&q=takeout+coffee+nearby&tz=420"
      },
      {
        "query": "maca coffee",
        "value": "+1,900%",
        "extracted_value": 1900,
        "link": "https://trends.google.com/trends/explore?q=maca+coffee&date=today+12-m",
        "serpapi_link": "https://serpapi.com/search.json?data_type=RELATED_QUERIES&date=today+12-m&engine=google_trends&q=maca+coffee&tz=420"
      },
      ...
    ],
    "top": [
      {
        "query": "coffee near me",
        "value": "100",
        "extracted_value": 100,
        "link": "https://trends.google.com/trends/explore?q=coffee+near+me&date=today+12-m",
        "serpapi_link": "https://serpapi.com/search.json?data_type=RELATED_QUERIES&date=today+12-m&engine=google_trends&q=coffee+near+me&tz=420"
      },
      {
        "query": "the coffee",
        "value": "86",
        "extracted_value": 86,
        "link": "https://trends.google.com/trends/explore?q=the+coffee&date=today+12-m",
        "serpapi_link": "https://serpapi.com/search.json?data_type=RELATED_QUERIES&date=today+12-m&engine=google_trends&q=the+coffee&tz=420"
      },
      {
        "query": "coffee shop",
        "value": "80",
        "extracted_value": 80,
        "link": "https://trends.google.com/trends/explore?q=coffee+shop&date=today+12-m",
        "serpapi_link": "https://serpapi.com/search.json?data_type=RELATED_QUERIES&date=today+12-m&engine=google_trends&q=coffee+shop&tz=420"
      },
      ...
    ]
  }
}
Search results for a specified
category
with no query provided
A Google Trends search without a query is valid with filters (cat). In this example, it is filtered to show only TIMESERIES results from the category 319 (Cartoons).

GET


https://serpapi.com/search.json?engine=google_trends&cat=319

Code to integrate


Ruby

require "serpapi" 

client = SerpApi::Client.new(
  engine: "google_trends",
  cat: "319",
  api_key: "1e3bd61c96d4412032799f0c8b3509ad902b53b67122ea37695364cc094663d4"
)

results = client.search

JSON Example

{
  "search_parameters": {
    "engine": "google_trends",
    "cat": "319",
    "date": "today 12-m",
    "tz": "420",
    "data_type": "TIMESERIES"
  },
  "interest_over_time": {
    "timeline_data": [
      {
        "date": "Apr 30–May 6, 2023",
        "timestamp": "1682812800",
        "values": [
          {
            "value": "81",
            "extracted_value": 81
          }
        ]
      },
      {
        "date": "May 7–13, 2023",
        "timestamp": "1683417600",
        "values": [
          {
            "value": "77",
            "extracted_value": 77
          }
        ]
      },
      {
        "date": "May 14–20, 2023",
        "timestamp": "1684022400",
        "values": [
          {
            "value": "84",
            "extracted_value": 84
          }
        ]
      },
    ...
    ],
  },
  ...
}
Understanding the 
tz
 parameter
The tz parameter in our Google Trends API is calculated as the UTC offset in minutes.

For instance, consider Tokyo, which operates on JST (UTC+9). If the local time is 3:00 PM in Tokyo, UTC time is 6:00 AM. The calculation for tz would be (9 hours ahead of UTC) * 60 minutes, resulting in a tz value of -540. (If you subtract 540 minutes, you get back to UTC.) This parameter ensures that time-sensitive data aligns correctly with the selected region’s local time.

Additionally, the tz parameter influences search results based on different date parameter values. For example, in queries like "sakura," the effect of tz can be observed up to 7 days of data (using "now 7-d" as the date parameter). Any date value below 7 days will still affect the results. This impact might vary for different queries and their respective date parameters.

It is important to adjust this value based on daylight saving changes or other time variations to maintain data accuracy. The tz range spans from -1439 to 1439, allowing for granular control over time zone settings in the API response.

To make sure the value is correct, please refer to the time zone database and your programming language UTC offset calculation.

GET


https://serpapi.com/search.json?engine=google_trends&q=sakura&date=now+7-d&tz=-540&data_type=TIMESERIES

Code to integrate


Ruby

require "serpapi" 

client = SerpApi::Client.new(
  engine: "google_trends",
  q: "sakura",
  date: "now 7-d",
  tz: "-540",
  data_type: "TIMESERIES",
  api_key: "1e3bd61c96d4412032799f0c8b3509ad902b53b67122ea37695364cc094663d4"
)

results = client.search
interest_over_time = results[:interest_over_time]

JSON Example

{
  "search_metadata": {
    "id": "657239d3914a812bcc1ec38c",
    "status": "Success",
    "json_endpoint": "https://serpapi.com/searches/b5d20cabd1895206/657239d3914a812bcc1ec38c.json",
    "created_at": "2023-12-07 21:32:03 UTC",
    "processed_at": "2023-12-07 21:32:03 UTC",
    "google_trends_url": "https://trends.google.com/trends/api/explore?tz=540&req=%7B%22comparisonItem%22%3A%5B%7B%22keyword%22%3A%22sakura%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22now+7-d%22%7D%5D%2C%22category%22%3A0%2C%22property%22%3A%22%22%2C%22userConfig%22%3A%22%7BuserType%3A+%5C%22USER_TYPE_LEGIT_USER%5C%22%7D%22%7D",
    "raw_html_file": "https://serpapi.com/searches/b5d20cabd1895206/657239d3914a812bcc1ec38c.html",
    "prettify_html_file": "https://serpapi.com/searches/b5d20cabd1895206/657239d3914a812bcc1ec38c.prettify",
    "total_time_taken": 1.35
  },
  "search_parameters": {
    "engine": "google_trends",
    "q": "sakura",
    "date": "now 7-d",
    "tz": "-540",
    "data_type": "TIMESERIES"
  },
  "interest_over_time": {
    "timeline_data": [
      {
        "date": "Nov 30, 2023 at 1:00 PM",
        "timestamp": "1701381600",
        "values": [
          {
            "query": "sakura",
            "value": "63",
            "extracted_value": 63
          }
        ]
      },
      {
        "date": "Nov 30, 2023 at 2:00 PM",
        "timestamp": "1701385200",
        "values": [
          {
            "query": "sakura",
            "value": "73",
            "extracted_value": 73
          }
        ]
      },
      {
        "date": "Nov 30, 2023 at 3:00 PM",
        "timestamp": "1701388800",
        "values": [
          {
            "query": "sakura",
            "value": "75",
            "extracted_value": 75
          }
        ]
      },
      ...
    ]
  }
}
Compared breakdown by region 
q
:
Football, Basketball, Golf
, 
data_type
:
GEO_MAP
and 
include_low_search_volume
:
true
Parameter include_low_search_volume can be set to true for including low search volume regions in the results.

GET


https://serpapi.com/search.json?engine=google_trends&q=Football,+Basketball,+Golf&data_type=GEO_MAP&include_low_search_volume=true

Code to integrate


Ruby

require "serpapi" 

client = SerpApi::Client.new(
  engine: "google_trends",
  q: "Football, Basketball, Golf",
  data_type: "GEO_MAP",
  include_low_search_volume: "true",
  api_key: "1e3bd61c96d4412032799f0c8b3509ad902b53b67122ea37695364cc094663d4"
)

results = client.search
compared_breakdown_by_region = results[:compared_breakdown_by_region]

JSON Example

{
  "search_metadata": {
    "id": "6724aae5a54d754e9add4817",
    "status": "Success",
    "json_endpoint": "https://serpapi.com/searches/4663dda0bb1ffb03/6724aae5a54d754e9add4817.json",
    "created_at": "2024-11-01 10:18:13 UTC",
    "processed_at": "2024-11-01 10:18:13 UTC",
    "google_trends_url": "https://trends.google.com/trends/api/explore?hl=en&tz=420&req=%7B%22comparisonItem%22%3A%5B%7B%22keyword%22%3A%22Football%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22today+12-m%22%7D%2C%7B%22keyword%22%3A%22Basketball%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22today+12-m%22%7D%2C%7B%22keyword%22%3A%22Golf%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22today+12-m%22%7D%5D%2C%22category%22%3A0%2C%22property%22%3A%22%22%2C%22userConfig%22%3A%22%7BuserType%3A+%5C%22USER_TYPE_LEGIT_USER%5C%22%7D%22%7D",
    "raw_html_file": "https://serpapi.com/searches/4663dda0bb1ffb03/6724aae5a54d754e9add4817.html",
    "prettify_html_file": "https://serpapi.com/searches/4663dda0bb1ffb03/6724aae5a54d754e9add4817.prettify",
    "total_time_taken": 1.95
  },
  "search_parameters": {
    "engine": "google_trends",
    "q": "Football, Basketball, Golf",
    "hl": "en",
    "date": "today 12-m",
    "tz": "420",
    "data_type": "GEO_MAP",
    "include_low_search_volume": "true"
  },
  "compared_breakdown_by_region": [
    {
      "geo": "SL",
      "location": "Sierra Leone",
      "max_value_index": 0,
      "values": [
        {
          "query": "Football",
          "value": "97%",
          "extracted_value": 97
        },
        {
          "query": "Basketball",
          "value": "3%",
          "extracted_value": 3
        },
        {
          "query": "Golf",
          "value": "",
          "extracted_value": 0
        }
      ]
    },
    {
      "geo": "LR",
      "location": "Liberia",
      "max_value_index": 0,
      "values": [
        {
          "query": "Football",
          "value": "95%",
          "extracted_value": 95
        },
        {
          "query": "Basketball",
          "value": "5%",
          "extracted_value": 5
        },
        {
          "query": "Golf",
          "value": "",
          "extracted_value": 0
        }
      ]
    },
    {
      "geo": "SS",
      "location": "South Sudan",
      "max_value_index": 0,
      "values": [
        {
          "query": "Football",
          "value": "88%",
          "extracted_value": 88
        },
        {
          "query": "Basketball",
          "value": "12%",
          "extracted_value": 12
        },
        {
          "query": "Golf",
          "value": "",
          "extracted_value": 0
        }
      ]
    },
    ...
  ]
}