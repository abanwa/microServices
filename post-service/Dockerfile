# use the official node.js 18 image and alpine linux as the base image

FROM node:18-alpine

# this is our working directory
WORKDIR /use/src/app

# the reason we are doing this one before the rest of the files is to take advantage of the docker cache. if our package file haven't chnaged, everytime, docker will use from our cache dependencies
COPY package*.json ./

# the will help so that the dependencies packages are not installed like nodemon. The only advantage is to keep our docker image size smaller
RUN npm ci --only=production

# Now, we will copy the rest of the code to the working directory
COPY . .

# we will tell docker which port we want to expose
EXPOSE 3002

# this is the command that will run
CMD ["node", "src/server.js"]