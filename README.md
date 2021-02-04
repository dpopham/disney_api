## Darren's Disney API

Written by Darren Popham
License: ISC

### What is this?

A sample project I was playing with that wraps the existing <a href="https://github.com/cubehouse/themeparks" target="_blank">themeparks plugin</a> written by Cubehouse that provides a simple API interface to query for the data in an online service.

It's not exactly a hypermedia style API but it is close.  Part of the reason for building it in this fashion was for consistency and to be able to use the API responses as a learning tool and provide a clue as to what to do next.   As well it looks cool.

## What do I use it for?

If you wanted to use the above mentioned themeparks plugin but did not want to build its functionality directly into your code but instead access the data through a restful API then this type of project may be a solution for you.  Heck if something like this were included in the themeparks plugin (not this code though, it's not pretty, I just hammered it out in a short time to git 'r done, not win awards) then quite possibly the adoption of using the themeparks plugin could increase, IMHO of course.

That said though this could prove useful to someone, so Enjoy!

## How do I use it?

It runs as a node service.  I included a supervisor config file if you want to launch it that way as merely an example.

As well to use this you will likely need a front end web server that does all the SSL temrination, filtering, ensuring the URL requested is valid and then proxying the remaining safe URL to the API service.  Don't expose something like this directly on a network, use existing tools (like nginx) to sit in front and protect it.

## What is this swagger thing?

Swagger (<a href="https://swagger.io">swagger.io</a>) is a tool that allows you to build and interact with RESTful APIs.  It can integrate into your code and/or rely upon a json file to define its functions and data types.  In this case I provided a swagger.json file to define what happens and then use the swagger module to interface into the service.   Think of it as a developer's test tool.  Plus it's fun to play with.

## Why is there no client application?

I got bored.




