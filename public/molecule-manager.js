window.MoleculeManager = class MoleculeManager {
  constructor() {
    this.map = {};
  }

  addMolecule(graphic) {
    if (this.validDefinition(graphic)) {
      let molecule = graphic.molecules[0];
      let sites = molecule.sites;
      //change parameters of sites to show its from parent
      sites.forEach((item, i) => {
        this.inheritType = true;
        item.color = "cfcfcf";
        item.bondName = null;
        item.states = [];
        item.textColor = "cfcfcf";
      });
      let name = molecule.name;
      this.map[name] = sites;
    }
  }

  validDefinition(graphic) {
    return (graphic && graphic.molecules && graphic.molecules.length === 1);
  }

  getSites(name) {
    return this.map[name];
  }

  hasMolecules() {
    return ((Object.keys(this.map).length > 0) ? true : false);
  }

  has(graphic) {
    let molecule = graphic.molecules[0];
    return (this.validDefinition(graphic) && this.hasOwnProperty(molecule.name));
  }

  reset() {
    this.map = {};
  }
}
