
const geocode = async  (arg) => {
    return await fetch( `https://api.mapbox.com/geocoding/v5/mapbox.places/${arg}.json?access_token=${mapboxgl.accessToken}`)
}
mapboxgl.accessToken = 'pk.eyJ1IjoiYXJuYWJjYXJlMjEiLCJhIjoiY2tzMG10aGZrMHVyeDJ2cW1vaGVwM3FzYyJ9.65bXVDM9bYtYBpSvyQWH-w';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: new mapboxgl.LngLat(-95.420679, 39.772537),
    zoom: 2
});
map.on('load', function () {
    map.resize();
});
map.addControl(new mapboxgl.NavigationControl());

try{
    for(let campground of campgrounds){
        geocode(campground.location).then((data) => {
            return data.json();
        }).then((data) => {
            const marker = new mapboxgl.Marker({
                color: "#FFFFFF",
                draggable: false,
                }).setLngLat([data.features[0].geometry.coordinates[0],data.features[0].geometry.coordinates[1]] )
                .addTo(map);
        })
    }
}   catch(e){
    geocode(singleItem.location).then((data) => {
        return data.json();
    }).then((data) => {
        const marker = new mapboxgl.Marker({
            color: "#FFFFFF",
            draggable: false,
            }).setLngLat([data.features[0].geometry.coordinates[0],data.features[0].geometry.coordinates[1]] )
            .addTo(map);

    })
}
