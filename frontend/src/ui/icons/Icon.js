const UI = require('../../utils/UI.js');

class Icon extends UI {
	constructor(params) {
		super(params);
		this._flip = params.flip || false;

		this._data.icon = params.icon || 'up';
		this._data.flip = this._flip;
	}

	template() {
		return `
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" {{if(options.flip)}}class="flip"{{/if}}>
				<g fill="none" fill-rule="evenodd">
					{{if (options.icon=='check')}}
				    <polygon points="0 0 19 0 19 14 0 14"/>
					{{#else}}
					<polygon points="0 0 24 0 24 24 0 24"/>
					{{/if}}
					{{if (options.icon=='up')}}
					<path fill="#000" fill-rule="nonzero" d="M12,9.41421356 L18.2928932,15.7071068 C18.6834175,16.0976311 19.3165825,16.0976311 19.7071068,15.7071068 C20.0976311,15.3165825 20.0976311,14.6834175 19.7071068,14.2928932 L12.7071068,7.29289322 C12.3165825,6.90236893 11.6834175,6.90236893 11.2928932,7.29289322 L4.29289322,14.2928932 C3.90236893,14.6834175 3.90236893,15.3165825 4.29289322,15.7071068 C4.68341751,16.0976311 5.31658249,16.0976311 5.70710678,15.7071068 L12,9.41421356 Z"/>
				    {{/if}}
					{{if (options.icon=='edit')}}
				    <path fill="#000" fill-rule="nonzero" d="M7.70710678,20.7071068 C7.5195704,20.8946432 7.26521649,21 7,21 L4,21 C3.44771525,21 3,20.5522847 3,20 L3,17 C3,16.7347835 3.10535684,16.4804296 3.29289322,16.2928932 L16.5857864,3 C17.3257272,2.26005924 18.5012114,2.22111499 19.2869988,2.88316725 L19.4142136,3 L21,4.58578644 C21.7399408,5.3257272 21.778885,6.50121136 21.1168328,7.28699879 L21,7.41421356 L7.70710678,20.7071068 Z M5,17.4142136 L5,19 L6.58578644,19 L16.5857864,9 L15,7.41421356 L5,17.4142136 Z M18,4.41421356 L16.414,5.99921356 L18,7.58521356 L19.5857864,6 L18,4.41421356 Z"/>
				    {{/if}}
					{{if (options.icon=='eye')}}
				    <path fill="#000" fill-rule="nonzero" d="M12.0037244,5.5 C17.8510242,5.5 22,10.459316 22,12 C22,13.540684 17.8733706,18.5 12.0037244,18.5 C6.17877095,18.5 2,13.540684 2,12 C2,10.459316 6.20856611,5.5 12.0037244,5.5 Z M12,8 C9.790861,8 8,9.790861 8,12 C8,14.209139 9.790861,16 12,16 C14.209139,16 16,14.209139 16,12 C16,9.790861 14.209139,8 12,8 Z M12,10.5 C12.8284271,10.5 13.5,11.1715729 13.5,12 C13.5,12.8284271 12.8284271,13.5 12,13.5 C11.1715729,13.5 10.5,12.8284271 10.5,12 C10.5,11.1715729 11.1715729,10.5 12,10.5 Z"/>
				    {{/if}}
					{{if (options.icon=='eye2')}}
				    <path fill="#000" fill-rule="nonzero" d="M3.24742331,4.34149539 C3.58312982,3.95783081 4.14726,3.89243104 4.5589723,4.17068553 L4.65850461,4.24742331 L20.6585046,18.2474233 C21.0741412,18.6111054 21.1162587,19.242868 20.7525767,19.6585046 C20.4168702,20.0421692 19.85274,20.107569 19.4410277,19.8293145 L19.3414954,19.7525767 L16.678014,17.4222694 C15.3119739,18.0692771 13.7335408,18.5 12.0037244,18.5 C6.17877095,18.5 2,13.540684 2,12 C2,11.1350242 3.32652339,9.19250915 5.51558991,7.65500291 L3.34149539,5.75257669 C2.92585876,5.38889464 2.88374125,4.75713202 3.24742331,4.34149539 Z M8,12 C8,14.209139 9.790861,16 12,16 C12.836931,16 13.6138279,15.7429633 14.2560564,15.3035242 L12.1815054,13.4891302 C12.1220062,13.4963068 12.0614344,13.5 12,13.5 C11.1773258,13.5 10.509335,12.8377221 10.500097,12.017236 L8.42584708,10.2021204 C8.15342141,10.7426353 8,11.3534009 8,12 Z M12.0037244,5.5 C17.8510242,5.5 22,10.459316 22,12 C22,12.6358131 21.2972072,13.8538424 20.059148,15.0652638 L15.9670652,11.4843103 C15.7225066,9.58427469 14.1447921,8.10174686 12.2022178,8.00502282 L11.984,8 L9.48427708,5.81332663 C10.2814494,5.61420081 11.1243193,5.5 12.0037244,5.5 Z"/>
				    {{/if}}
					{{if (options.icon=='photo')}}
    				<path fill="#000" fill-rule="nonzero" d="M19.8833789,16.0067277 L20,16 C20.5128358,16 20.9355072,16.3860402 20.9932723,16.8833789 L21,17 L21,19 L23,19 C23.5128358,19 23.9355072,19.3860402 23.9932723,19.8833789 L24,20 C24,20.5128358 23.6139598,20.9355072 23.1166211,20.9932723 L23,21 L21,21 L21,23 C21,23.5128358 20.6139598,23.9355072 20.1166211,23.9932723 L20,24 C19.4871642,24 19.0644928,23.6139598 19.0067277,23.1166211 L19,23 L19,21 L17,21 C16.4871642,21 16.0644928,20.6139598 16.0067277,20.1166211 L16,20 C16,19.4871642 16.3860402,19.0644928 16.8833789,19.0067277 L17,19 L19,19 L19,17 C19,16.4871642 19.3860402,16.0644928 19.8833789,16.0067277 L20,16 L19.8833789,16.0067277 Z M8.41421356,2 L13.5857864,2 C14.0572824,2 14.5116128,2.16648982 14.8701798,2.46691315 L15,2.58578644 L16.4142136,4 L18,4 C19.5976809,4 20.9036609,5.24891996 20.9949073,6.82372721 L21,7 L21,12 C21,12.5522847 20.5522847,13 20,13 C19.4871642,13 19.0644928,12.6139598 19.0067277,12.1166211 L19,12 L19,7 C19,6.48716416 18.6139598,6.06449284 18.1166211,6.00672773 L18,6 L16.4142136,6 C15.9427176,6 15.4883872,5.83351018 15.1298202,5.53308685 L15,5.41421356 L13.5857864,4 L8.41421356,4 L7,5.41421356 C6.66660199,5.74761157 6.22761579,5.95114561 5.76163928,5.99225938 L5.58578644,6 L4,6 C3.48716416,6 3.06449284,6.38604019 3.00672773,6.88337887 L3,7 L3,18 C3,18.5128358 3.38604019,18.9355072 3.88337887,18.9932723 L4,19 L13,19 C13.5522847,19 14,19.4477153 14,20 C14,20.5128358 13.6139598,20.9355072 13.1166211,20.9932723 L13,21 L4,21 C2.40231912,21 1.09633912,19.75108 1.00509269,18.1762728 L1,18 L1,7 C1,5.40231912 2.24891996,4.09633912 3.82372721,4.00509269 L4,4 L5.58578644,4 L7,2.58578644 C7.33339801,2.25238843 7.77238421,2.04885439 8.23836072,2.00774062 L8.41421356,2 L13.5857864,2 L8.41421356,2 Z M11,7 C13.7614237,7 16,9.23857625 16,12 C16,14.7614237 13.7614237,17 11,17 C8.23857625,17 6,14.7614237 6,12 C6,9.23857625 8.23857625,7 11,7 Z M11,9 C9.34314575,9 8,10.3431458 8,12 C8,13.6568542 9.34314575,15 11,15 C12.6568542,15 14,13.6568542 14,12 C14,10.3431458 12.6568542,9 11,9 Z"/>
    				{{/if}}
				    {{if (options.icon=='close')}}
				    <path fill="#000" fill-rule="nonzero" d="M5.20970461,5.38710056 L5.29289322,5.29289322 C5.65337718,4.93240926 6.22060824,4.90467972 6.61289944,5.20970461 L6.70710678,5.29289322 L12,10.585 L17.2928932,5.29289322 C17.6834175,4.90236893 18.3165825,4.90236893 18.7071068,5.29289322 C19.0976311,5.68341751 19.0976311,6.31658249 18.7071068,6.70710678 L13.415,12 L18.7071068,17.2928932 C19.0675907,17.6533772 19.0953203,18.2206082 18.7902954,18.6128994 L18.7071068,18.7071068 C18.3466228,19.0675907 17.7793918,19.0953203 17.3871006,18.7902954 L17.2928932,18.7071068 L12,13.415 L6.70710678,18.7071068 C6.31658249,19.0976311 5.68341751,19.0976311 5.29289322,18.7071068 C4.90236893,18.3165825 4.90236893,17.6834175 5.29289322,17.2928932 L10.585,12 L5.29289322,6.70710678 C4.93240926,6.34662282 4.90467972,5.77939176 5.20970461,5.38710056 L5.29289322,5.29289322 L5.20970461,5.38710056 Z"/>
				    {{/if}}
				    {{if (options.icon=='check')}}
					<path fill="#000" fill-rule="nonzero" d="M7.96833846,10.0490996 L14.5108251,2.571972 C14.7472185,2.30180819 15.1578642,2.27443181 15.428028,2.51082515 C15.6711754,2.72357915 15.717665,3.07747757 15.5522007,3.34307913 L15.4891749,3.428028 L8.48917485,11.428028 C8.2663359,11.6827011 7.89144111,11.7199091 7.62486888,11.5309823 L7.54038059,11.4596194 L4.54038059,8.45961941 C4.2865398,8.20577862 4.2865398,7.79422138 4.54038059,7.54038059 C4.7688373,7.31192388 5.12504434,7.28907821 5.37905111,7.47184358 L5.45961941,7.54038059 L7.96833846,10.0490996 L14.5108251,2.571972 L7.96833846,10.0490996 Z"/>
				    {{/if}}
				</g>
			</svg>
		`;
	}
};

module.exports = Icon;


