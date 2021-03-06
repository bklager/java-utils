const xml2js = require('xml2js');

const getCoordinatesFromNode = (node) => {
  //parent checks work on the same level as the node so it is not possible for parents or dependencies 
  const groupId = node.groupId ? node.groupId[0] : (node.parent ? getCoordinatesFromNode(node.parent[0]).groupId : undefined );
  const artifactId = node.artifactId ? node.artifactId[0] : undefined;
  const version = node.version ? node.version[0] : (node.parent ? getCoordinatesFromNode(node.parent[0]).version : undefined );

  return {
    groupId,
    artifactId,
    version
  };
};

const getRepositoryPolicy = (release) => {
  const enabled = release.enabled ? release.enabled[0] : undefined;
  const updatePolicy = release.updatePolicy ? release.updatePolicy[0] : undefined;
  const checksumPolicy = release.checksumPolicy ? release.checksumPolicy[0] : undefined;

  return {
    enabled,
    updatePolicy,
    checksumPolicy
  };
};

const readRepositoriesFromProject = (project) => {
  if (!project.repositories || !project.repositories[0] || !project.repositories[0].repository) {
    return [];
  }

  return project.repositories[0].repository.map((repository) => {
    const id = repository.id ? repository.id[0] : undefined;
    const url = repository.url ? repository.url[0] : undefined; 
    const name = repository.name ? repository.name[0] : undefined;
    const layout = repository.layout ? repository.layout[0] : undefined;

    let releases = undefined;
    let snapshots = undefined;

    if(repository.releases && repository.releases[0]){
      releases = getRepositoryPolicy(repository.releases[0]);
    }
    if(repository.snapshots && repository.snapshots[0]){
      snapshots = getRepositoryPolicy(repository.snapshots[0]);
    }

    return{
      id,
      url,
      name,
      layout,
      releases,
      snapshots
    };
  });
};

const readDependenciesFromProject = (project) => {
  if (!project.dependencies || !project.dependencies[0] || !project.dependencies[0].dependency) {
    return [];
  }

  return project.dependencies[0].dependency.map((dependency) => {
    const scope = dependency.scope ? dependency.scope[0] : undefined;
    
    return {
      ...getCoordinatesFromNode(dependency),
      scope
    };
  });
};

const buildJSONStructure = (project) => {
  let parentCoordinates = undefined;
  if (project.parent && project.parent[0]) {
    parentCoordinates = getCoordinatesFromNode(project.parent[0]);
  }

  return {
    ...getCoordinatesFromNode(project),
    parent: parentCoordinates,
    dependencies: readDependenciesFromProject(project),
    repositories: readRepositoriesFromProject(project)
  };
};

const parsePOMFromString = (pomContents) => {
  return new Promise((resolve) => {
    return xml2js.parseString(pomContents, (err, result) => {
      resolve(result);
    });
  }).then(result => result.project)
    .then(buildJSONStructure);
};

module.exports = {parsePOMFromString};