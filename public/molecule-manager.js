window.MoleculeManager = class MoleculeManager {
  constructor() {
    this.map = {};
  }

  addMolecule(graphic) {
    if (graphic.molecules.length != 1) {
      throw new Error("Molecule defintion doesn't have exactly 1 molecule");
    }
    let molecule = graphic.molecules[0];
    let sites = molecule.sites;
    //change parameters of sites to show its from parent
    sites.forEach((item, i) => {
      item.color = "cfcfcf";
      item.bondName = null;
      item.states = [];
      /* item.name = item.name.replace(new RegExp(/./g),'.') ;*/
    });
    let name = molecule.name;
    this.map[name] = sites;
  }

  getSites(name) {
    return this.map[name];
  }

  hasMolecules() {
    return ((Object.keys(this.map).length > 0) ? true : false);
  }
}
