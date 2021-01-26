module.exports = {
    vaxSites: [
        { 
            name: 'Union',
            url: 'https://ucnjvaccine.org/index.php/vaccine/vaccine_availability',
            bitly: 'http://bit.ly/39k8zkh',
            selectors: ['#datatable-grouping'],
            emptyIndicator: '.dataTables_empty'
        },
        { 
            name: 'ShopRite',
            url: 'https://www.shoprite.com/pharmacy/',
            bitly: 'https://bit.ly/2NChULO',
            selectors: ['.pictureWithTextAd__image', '#MainPart_divProgressbar'],
            emptyIndicator: '#MainPart_pMessageOnQueueTicket #MainPart_divTimeBox_Holder_Frame',
        }
    ]
};

