# %service_name%
##### Building the Service
The following microservice was generated using Swagger Editor in SOAJS Dashboard. However the microservice still needs to be build so that all the folders & files related to the Business Logic get created.

Follow these steps to build this service:
 - In your terminal, navigate to the folder of this service
 - Run the following commands :
```sh
$ cd %service_name%
$ npm install
$ grunt build
```
The above will install all the dependencies needed for this service then running grunt build will generate all the folders and files that this microservice should dispose of based on the swagger.yml file content.

#### Rebuilding the Service
If you already built the service and you have updated the swagger.yml file after, then you need to rebuild the service for the changes to take effect.
Run the following commands :
```sh
$ cd %service_name%
$ grunt rebuild
```